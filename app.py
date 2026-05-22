import json
import os
import uuid
from pathlib import Path

import qrcode
from flask import (
    Flask,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")


DATA_DIR = Path("data")
DATA_FILE = DATA_DIR / "equipment.json"
ACCOUNTS_FILE = DATA_DIR / "accounts.json"
QR_DIR = Path("static") / "qr"


DEFAULT_ACCOUNTS = [
    {
        "id": "admin",
        "email": "admin@example.com",
        "password": "admin123",
        "role": "admin",
    },
    {
        "id": "techlead",
        "email": "techlead@example.com",
        "password": "techlead123",
        "role": "user",
    },
]


DEFAULT_EQUIPMENT = [
    {
        "id": "demo-a1",
        "name": "Тележка штабелер Lincoln",
        "serial": "INV-2025-014",
        "location": "Цех 3 / Зона погрузки",
        "owner": "Анна П.",
        "ownerPhone": "+7 900 000-10-10",
        "status": "active",
        "note": "Сменили колёса в ноябре",
        "serviceOwner": "",
        "servicePhone": "",
    },
    {
        "id": "demo-b2",
        "name": "Погрузчик Atlas",
        "serial": "INV-2024-102",
        "location": "Цех 1 / Ремзона",
        "owner": "Игорь К.",
        "ownerPhone": "+7 900 000-10-11",
        "status": "repair",
        "note": "Замена гидравлики, ждём запчасти",
        "serviceOwner": "techlead@example.com",
        "servicePhone": "+7 900 000-00-01",
    },
    {
        "id": "demo-c3",
        "name": "Робот-помощник Still",
        "serial": "INV-2024-210",
        "location": "Склад / Док 4",
        "owner": "Елена С.",
        "ownerPhone": "+7 900 000-10-12",
        "status": "idle",
        "note": "",
        "serviceOwner": "",
        "servicePhone": "",
    },
]


class EquipmentStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.items = []
        self._load()

    def _load(self):
        if not self.path.exists():
            self.items = DEFAULT_EQUIPMENT.copy()
            self._save()
            return
        with self.path.open("r", encoding="utf-8") as f:
            self.items = json.load(f)
        changed = False
        for item in self.items:
            if not item.get("id"):
                item["id"] = uuid.uuid4().hex[:10]
                changed = True
        if changed:
            self._save()

    def _save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as f:
            json.dump(self.items, f, ensure_ascii=False, indent=2)

    def all(self):
        return list(self.items)

    def get(self, item_id):
        return next((i for i in self.items if i.get("id") == item_id), None)

    def add(self, payload: dict):
        serial = payload.get("serial", "").strip()
        if any(i.get("serial", "").lower() == serial.lower() for i in self.items):
            raise ValueError("serial_exists")

        item = {
            "id": uuid.uuid4().hex[:10],
            "name": payload.get("name", "").strip(),
            "serial": serial,
            "location": payload.get("location", "").strip(),
            "owner": payload.get("owner", "").strip(),
            "ownerPhone": payload.get("ownerPhone", "").strip(),
            "status": payload.get("status", "idle"),
            "note": payload.get("note", "").strip(),
            "serviceOwner": payload.get("serviceOwner", "").strip(),
            "servicePhone": payload.get("servicePhone", "").strip(),
        }
        self.items.insert(0, item)
        self._save()
        return item

    def update(self, item_id: str, fields: dict):
        item = self.get(item_id)
        if not item:
            return None
        allowed = {
            "name",
            "serial",
            "location",
            "owner",
            "ownerPhone",
            "status",
            "note",
            "serviceOwner",
            "servicePhone",
        }
        for key, value in fields.items():
            if key in allowed:
                item[key] = value.strip() if isinstance(value, str) else value
        self._save()
        return item


store = EquipmentStore(DATA_FILE)


class AccountStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.items = []
        self._load()

    def _load(self):
        if not self.path.exists():
            self.items = DEFAULT_ACCOUNTS.copy()
            self._save()
            return
        with self.path.open("r", encoding="utf-8") as f:
            self.items = json.load(f)
        changed = False
        for account in self.items:
            if not account.get("id"):
                account["id"] = uuid.uuid4().hex[:10]
                changed = True
            if account.get("email"):
                normalized = account["email"].strip().lower()
                if normalized != account["email"]:
                    account["email"] = normalized
                    changed = True
            if account.get("role") not in {"admin", "user"}:
                account["role"] = "user"
                changed = True
        if changed:
            self._save()

    def _save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as f:
            json.dump(self.items, f, ensure_ascii=False, indent=2)

    def all(self):
        return list(self.items)

    def public(self, account: dict):
        if not account:
            return None
        return {
            "id": account.get("id"),
            "email": account.get("email"),
            "role": account.get("role", "user"),
        }

    def get(self, account_id: str):
        return next((a for a in self.items if a.get("id") == account_id), None)

    def find_by_email(self, email: str):
        return next(
            (
                a
                for a in self.items
                if a.get("email", "").lower() == (email or "").lower()
            ),
            None,
        )

    def add(self, payload: dict):
        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")
        role = payload.get("role", "user")
        if not email or not password:
            raise ValueError("missing_fields")
        if self.find_by_email(email):
            raise ValueError("email_exists")
        account = {
            "id": uuid.uuid4().hex[:10],
            "email": email,
            "password": password,
            "role": role if role in {"admin", "user"} else "user",
        }
        self.items.append(account)
        self._save()
        return account

    def update(self, account_id: str, fields: dict):
        account = self.get(account_id)
        if not account:
            return None
        new_email = fields.get("email")
        new_password = fields.get("password")
        new_role = fields.get("role")

        if isinstance(new_email, str) and new_email.strip():
            normalized = new_email.strip().lower()
            existing = self.find_by_email(normalized)
            if existing and existing.get("id") != account_id:
                raise ValueError("email_exists")
            account["email"] = normalized

        if isinstance(new_password, str) and new_password.strip():
            account["password"] = new_password

        if new_role in {"admin", "user"}:
            account["role"] = new_role

        self._save()
        return account


accounts = AccountStore(ACCOUNTS_FILE)


def ensure_qr(item_id: str):
    QR_DIR.mkdir(parents=True, exist_ok=True)
    qr_path = QR_DIR / f"{item_id}.png"
    if qr_path.exists():
        return qr_path
    detail_url = url_for("equipment_detail", item_id=item_id, _external=True)
    img = qrcode.make(detail_url)
    img.save(qr_path)
    return qr_path


def enrich_item(item: dict):
    ensure_qr(item["id"])
    return {
        **item,
        "detail_url": url_for("equipment_detail", item_id=item["id"]),
        "label_url": url_for("equipment_label", item_id=item["id"]),
        "qr_url": url_for("static", filename=f"qr/{item['id']}.png"),
    }


def require_login():
    return "user" in session


def require_admin():
    return session.get("role") == "admin"


@app.route("/")
def index():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template(
        "index.html",
        user=session.get("user"),
        is_admin=require_admin(),
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        account = accounts.find_by_email(email)
        if account and account.get("password") == password:
            session["user"] = account.get("email")
            session["role"] = account.get("role", "user")
            session["user_id"] = account.get("id")
            return redirect(url_for("index"))
        error = "Неверный логин или пароль"
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.pop("user", None)
    session.pop("role", None)
    session.pop("user_id", None)
    return redirect(url_for("login"))


@app.route("/api/equipment", methods=["GET", "POST"])
def api_equipment():
    if request.method == "GET":
        items = [enrich_item(item) for item in store.all()]
        return jsonify({"items": items})

    if not require_login():
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    missing = [f for f in ["name", "serial", "location", "owner"] if not data.get(f)]
    if missing:
        return jsonify({"error": f"missing:{','.join(missing)}"}), 400
    try:
        item = store.add(data)
    except ValueError as exc:
        if str(exc) == "serial_exists":
            return jsonify({"error": "serial_exists"}), 400
        raise
    ensure_qr(item["id"])
    return jsonify({"item": enrich_item(item)}), 201


@app.route("/api/equipment/<item_id>", methods=["GET", "PATCH"])
def api_equipment_item(item_id):
    item = store.get(item_id)
    if not item:
        return jsonify({"error": "not_found"}), 404

    if request.method == "GET":
        return jsonify({"item": enrich_item(item)})

    if not require_login():
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    updated = store.update(item_id, data)
    ensure_qr(item_id)
    return jsonify({"item": enrich_item(updated)})


@app.route("/api/accounts", methods=["GET", "POST"])
def api_accounts():
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401
    if not require_admin():
        return jsonify({"error": "forbidden"}), 403

    if request.method == "GET":
        return jsonify({"accounts": [accounts.public(a) for a in accounts.all()]})

    data = request.get_json(silent=True) or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "missing:email,password"}), 400
    try:
        account = accounts.add(data)
    except ValueError as exc:
        if str(exc) == "email_exists":
            return jsonify({"error": "email_exists"}), 400
        if str(exc) == "missing_fields":
            return jsonify({"error": "missing:email,password"}), 400
        raise
    return jsonify({"account": accounts.public(account)}), 201


@app.route("/api/accounts/<account_id>", methods=["PATCH"])
def api_account_item(account_id):
    if not require_login():
        return jsonify({"error": "unauthorized"}), 401
    if not require_admin():
        return jsonify({"error": "forbidden"}), 403

    account = accounts.get(account_id)
    if not account:
        return jsonify({"error": "not_found"}), 404

    data = request.get_json(silent=True) or {}
    try:
        updated = accounts.update(account_id, data)
    except ValueError as exc:
        if str(exc) == "email_exists":
            return jsonify({"error": "email_exists"}), 400
        raise
    if updated and account_id == session.get("user_id"):
        session["user"] = updated.get("email")
        session["role"] = updated.get("role", session.get("role"))
    return jsonify({"account": accounts.public(updated)})


@app.route("/equipment/<item_id>")
def equipment_detail(item_id):
    item = store.get(item_id)
    if not item:
        return render_template("equipment_detail.html", item=None), 404
    ensure_qr(item_id)
    return render_template(
        "equipment_detail.html",
        item=enrich_item(item),
    )


@app.route("/equipment/<item_id>/label")
def equipment_label(item_id):
    item = store.get(item_id)
    if not item:
        return render_template("equipment_label.html", item=None), 404
    ensure_qr(item_id)
    return render_template(
        "equipment_label.html",
        item=enrich_item(item),
    )


@app.route("/scan")
def scan():
    return render_template("scan.html")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

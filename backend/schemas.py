# backend/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from models import ProductCategory, PaymentType, CreditorStatus

# --- Product ---
class ProductBase(BaseModel):
    name: str
    category: ProductCategory
    unit: str
    price_per_unit: float
    current_stock: float = 0.0
    low_stock_threshold: float = 0.0

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    price_per_unit: Optional[float] = None
    current_stock: Optional[float] = None
    low_stock_threshold: Optional[float] = None

class ProductOut(ProductBase):
    id: int
    model_config = {"from_attributes": True}

# --- Supplier ---
class SupplierBase(BaseModel):
    name: str
    phone: str = ""
    address: str = ""

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    model_config = {"from_attributes": True}

# --- Customer ---
class CustomerBase(BaseModel):
    name: str
    phone: str = ""
    address: str = ""

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    model_config = {"from_attributes": True}

# --- Purchase ---
class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float

class PurchaseItemOut(PurchaseItemCreate):
    id: int
    model_config = {"from_attributes": True}

class PurchaseCreate(BaseModel):
    date: datetime
    supplier_id: int
    payment_type: PaymentType
    notes: str = ""
    items: List[PurchaseItemCreate]
    due_date: Optional[datetime] = None  # required when payment_type == credit

class PurchaseOut(BaseModel):
    id: int
    date: datetime
    supplier_id: int
    payment_type: PaymentType
    total_amount: float
    notes: str
    is_voided: bool
    void_reason: str
    items: List[PurchaseItemOut]
    model_config = {"from_attributes": True}

class VoidRequest(BaseModel):
    void_reason: str

# --- Sale ---
class SaleItemCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float

class SaleItemOut(SaleItemCreate):
    id: int
    model_config = {"from_attributes": True}

class SaleCreate(BaseModel):
    date: datetime
    customer_id: int
    notes: str = ""
    items: List[SaleItemCreate]

class SaleOut(BaseModel):
    id: int
    date: datetime
    customer_id: int
    total_amount: float
    notes: str
    is_voided: bool
    void_reason: str
    items: List[SaleItemOut]
    model_config = {"from_attributes": True}

# --- Invoice ---
class InvoiceCreate(BaseModel):
    sale_id: int
    payment_due_date: datetime
    validity_expiry_date: datetime

class InvoiceOut(BaseModel):
    id: int
    sale_id: int
    invoice_number: str
    issued_date: datetime
    payment_due_date: datetime
    validity_expiry_date: datetime
    is_paid: bool
    payment_alert_dismissed: bool
    validity_alert_dismissed: bool
    model_config = {"from_attributes": True}

# --- Creditor ---
class CreditorOut(BaseModel):
    id: int
    supplier_id: int
    purchase_id: int
    amount_owed: float
    due_date: datetime
    status: CreditorStatus
    supplier_name: str
    total_paid: float

class CreditorPaymentCreate(BaseModel):
    date: datetime
    amount_paid: float
    notes: str = ""

# --- Dashboard ---
class DashboardSummary(BaseModel):
    today_sales: float
    month_sales: float
    month_purchases: float
    net_profit: float
    low_stock_products: List[ProductOut]
    creditors_total_owed: float
    creditors_overdue_count: int
    payment_due_alerts: List[InvoiceOut]
    validity_expiry_alerts: List[InvoiceOut]

# --- Business Settings ---
class BusinessSettingsFields(BaseModel):
    business_name: str = "Your Business Name"
    tagline: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    ntn: str = ""
    strn: str = ""
    bank_name: str = ""
    bank_account: str = ""
    bank_iban: str = ""
    footer_note: str = "Thank you for your business!"

class CombinedSettingsUpdate(BusinessSettingsFields):
    payment_due_alert_days: int = 3
    validity_expiry_alert_days: int = 7

class CombinedSettingsOut(BusinessSettingsFields):
    id: int
    logo_filename: Optional[str] = None
    payment_due_alert_days: int
    validity_expiry_alert_days: int
    model_config = {"from_attributes": True}

# --- Units ---
class UnitCreate(BaseModel):
    name: str

class UnitOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}

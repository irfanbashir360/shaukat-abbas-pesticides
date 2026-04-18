# backend/models.py
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from database import Base

class ProductCategory(str, enum.Enum):
    fertilizer = "fertilizer"
    seed = "seed"
    pesticide = "pesticide"

class PaymentType(str, enum.Enum):
    cash = "cash"
    credit = "credit"

class CreditorStatus(str, enum.Enum):
    outstanding = "outstanding"
    partially_paid = "partially_paid"
    settled = "settled"

class MovementType(str, enum.Enum):
    purchase = "purchase"
    sale = "sale"
    void_purchase = "void_purchase"
    void_sale = "void_sale"

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(Enum(ProductCategory), nullable=False)
    unit = Column(String, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    current_stock = Column(Float, nullable=False, default=0.0)
    low_stock_threshold = Column(Float, nullable=False, default=0.0)

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, default="")
    address = Column(String, default="")
    purchases = relationship("Purchase", back_populates="supplier")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, default="")
    address = Column(String, default="")
    sales = relationship("Sale", back_populates="customer")

class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    payment_type = Column(Enum(PaymentType), nullable=False)
    total_amount = Column(Float, nullable=False)
    notes = Column(Text, default="")
    is_voided = Column(Boolean, default=False)
    void_reason = Column(String, default="")
    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")
    creditor = relationship("Creditor", back_populates="purchase", uselist=False)

class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product")

class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    notes = Column(Text, default="")
    is_voided = Column(Boolean, default=False)
    void_reason = Column(String, default="")
    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="sale", uselist=False)

class SaleItem(Base):
    __tablename__ = "sale_items"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    invoice_number = Column(String, nullable=False, unique=True)
    issued_date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    payment_due_date = Column(DateTime, nullable=False)
    validity_expiry_date = Column(DateTime, nullable=False)
    is_paid = Column(Boolean, default=False)
    payment_alert_dismissed = Column(Boolean, default=False)
    validity_alert_dismissed = Column(Boolean, default=False)
    sale = relationship("Sale", back_populates="invoice")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    movement_type = Column(Enum(MovementType), nullable=False)
    quantity_change = Column(Float, nullable=False)
    reference_id = Column(Integer, nullable=False)
    reference_type = Column(String, nullable=False, default="purchase")
    product = relationship("Product")

class Creditor(Base):
    __tablename__ = "creditors"
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    amount_owed = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(Enum(CreditorStatus), default=CreditorStatus.outstanding)
    supplier = relationship("Supplier")
    purchase = relationship("Purchase", back_populates="creditor")
    payments = relationship("CreditorPayment", back_populates="creditor", cascade="all, delete-orphan")

class CreditorPayment(Base):
    __tablename__ = "creditor_payments"
    id = Column(Integer, primary_key=True, index=True)
    creditor_id = Column(Integer, ForeignKey("creditors.id"), nullable=False)
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    amount_paid = Column(Float, nullable=False)
    notes = Column(Text, default="")
    creditor = relationship("Creditor", back_populates="payments")

class InvoiceAlertSettings(Base):
    __tablename__ = "invoice_alert_settings"
    id = Column(Integer, primary_key=True, index=True)
    payment_due_alert_days = Column(Integer, nullable=False, default=3)
    validity_expiry_alert_days = Column(Integer, nullable=False, default=7)

class BusinessSettings(Base):
    __tablename__ = "business_settings"
    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String, nullable=False, default="Your Business Name")
    tagline = Column(String, nullable=False, default="")
    address = Column(String, nullable=False, default="")
    phone = Column(String, nullable=False, default="")
    email = Column(String, nullable=False, default="")
    ntn = Column(String, nullable=False, default="")
    strn = Column(String, nullable=False, default="")
    bank_name = Column(String, nullable=False, default="")
    bank_account = Column(String, nullable=False, default="")
    bank_iban = Column(String, nullable=False, default="")
    footer_note = Column(String, nullable=False, default="Thank you for your business!")
    logo_filename = Column(String, nullable=True)

class Unit(Base):
    __tablename__ = "units"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

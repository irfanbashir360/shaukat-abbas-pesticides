# backend/SAP.spec
block_cipher = None

a = Analysis(
    ['launcher.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('static', 'static'),
        ('assets', 'assets'),
    ],
    hiddenimports=[
        'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan', 'uvicorn.lifespan.on',
        'reportlab', 'reportlab.lib', 'reportlab.platypus', 'reportlab.pdfgen',
        'pystray', 'PIL',
        'routers.products', 'routers.suppliers', 'routers.customers',
        'routers.purchases', 'routers.sales', 'routers.invoices',
        'routers.creditors', 'routers.dashboard', 'routers.reports', 'routers.settings',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, a.binaries, a.zipfiles, a.datas, [],
    name='ShaukatAbbasPesticides',
    debug=False,
    strip=False,
    upx=True,
    console=False,
    icon='assets/icon.ico',
)

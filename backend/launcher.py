# backend/launcher.py
import threading
import webbrowser
import time
import sys
import os
import uvicorn

def get_resource_path(relative_path: str) -> str:
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)

def start_server():
    from main import app
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

def main():
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    time.sleep(2)
    webbrowser.open("http://localhost:8000")

    try:
        from pystray import Icon, MenuItem, Menu
        from PIL import Image as PILImage
        icon_path = get_resource_path(os.path.join("assets", "icon.ico"))
        image = PILImage.open(icon_path)

        def quit_app(icon, item):
            icon.stop()
            sys.exit(0)

        def open_app(icon, item):
            webbrowser.open("http://localhost:8000")

        Icon("Shaukat Abbas Pesticides", image,
             menu=Menu(MenuItem("Open App", open_app), MenuItem("Quit", quit_app))).run()
    except Exception:
        t.join()

if __name__ == "__main__":
    main()

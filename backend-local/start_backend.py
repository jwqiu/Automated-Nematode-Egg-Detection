# run this file to start the local flask backend for testing and development
# not need to run this file in the packaged Electron application.

from app import app  

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5178, debug=False)
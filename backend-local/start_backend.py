from app import app  # 确保这里是你的 Flask 实例

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5178, debug=False)
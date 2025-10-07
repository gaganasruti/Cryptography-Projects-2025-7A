from flask import Flask, render_template, request, jsonify
from Crypto.Cipher import DES3
from Crypto.Util.Padding import pad, unpad
from base64 import b64encode, b64decode
import os

app = Flask(__name__, template_folder='.')

# --- Triple DES (3DES) Functions ---
def encrypt_3des(plaintext, key1_str, key2_str, key3_str):
    # Keys must be exactly 8 bytes for DES
    key1 = pad(key1_str.encode('utf-8'), 8)[:8]
    key2 = pad(key2_str.encode('utf-8'), 8)[:8]
    key3 = pad(key3_str.encode('utf-8'), 8)[:8]
    
    # Concatenate the three 8-byte keys to form a single 24-byte key for 3DES
    key = key1 + key2 + key3
    
    cipher = DES3.new(key, DES3.MODE_CBC)
    ciphertext = cipher.encrypt(pad(plaintext.encode('utf-8'), DES3.block_size))
    return b64encode(cipher.iv + ciphertext).decode('utf-8')

def decrypt_3des(ciphertext, key1_str, key2_str, key3_str):
    key1 = pad(key1_str.encode('utf-8'), 8)[:8]
    key2 = pad(key2_str.encode('utf-8'), 8)[:8]
    key3 = pad(key3_str.encode('utf-8'), 8)[:8]
    
    key = key1 + key2 + key3
    
    data = b64decode(ciphertext)
    iv = data[:DES3.block_size]
    encrypted_text = data[DES3.block_size:]
    cipher = DES3.new(key, DES3.MODE_CBC, iv)
    decrypted_text = unpad(cipher.decrypt(encrypted_text), DES3.block_size)
    return decrypted_text.decode('utf-8')

# --- Flask Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/how-it-works')
def how_it_works():
    return render_template('how_it_works.html')

@app.route('/process', methods=['POST'])
def process():
    data = request.get_json()
    text = data['text']
    key1 = data['key1']
    key2 = data['key2']
    key3 = data['key3']
    action = data['action']

    try:
        # Check if keys are provided
        if not key1 or not key2 or not key3:
            return jsonify({'error': "Please provide all three keys."}), 400

        if action == 'encrypt':
            result = encrypt_3des(text, key1, key2, key3)
        elif action == 'decrypt':
            result = decrypt_3des(text, key1, key2, key3)
    except Exception as e:
        return jsonify({'error': f"Error: {str(e)}. Please check your keys or input."}), 400

    return jsonify({'result': result})

if __name__ == '__main__':
    app.run(debug=True)
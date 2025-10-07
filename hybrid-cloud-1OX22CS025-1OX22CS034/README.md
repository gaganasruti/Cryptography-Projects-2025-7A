# 🔐 Hybrid Cloud Cryptographic File Storage System  
**Project by:** 1OX22CS025 & 1OX22CS034  
**Technologies Used:** React.js | AES | SHA-256 | LocalStorage  

---

## 🧠 Overview  
This project demonstrates a **secure hybrid cloud file storage system** built using **cryptographic techniques** to protect sensitive data before storage.  
It enables users to **upload**, **encrypt**, **store**, and **decrypt** files (Text and PDF) securely using **AES encryption** and **SHA-256 hashing** — all processed locally for enhanced privacy.  

This system mimics how hybrid cloud storage protects user data through encryption before uploading to a public or private environment.

---

## ⚙️ Features  

✅ **AES-256 File Encryption** – Every uploaded file is encrypted using a unique AES key and IV (Initialization Vector).  
✅ **SHA-256 Integrity Check** – Each encrypted file is hashed to ensure data has not been tampered with.  
✅ **LocalStorage Management** – Uploaded files, keys, and hashes are saved in the browser’s localStorage for persistence.  
✅ **Decryption Capability** – Users can decrypt and download their original files at any time.  
✅ **Restricted Uploads** – Only `.txt` and `.pdf` files are accepted; images and videos are rejected.  
✅ **Interactive React UI** – A modern interface to view, manage, and decrypt files easily.  

---

## 🧩 Tech Stack  

| Layer | Technology |
|--------|-------------|
| **Frontend** | React.js |
| **Backend (Optional)** | Node.js + Express (used in earlier version) |
| **Encryption Algorithm** | AES-256-CBC |
| **Hashing Algorithm** | SHA-256 |
| **Storage** | Browser LocalStorage |

---

## 🔒 How Cryptography Works  

| Step | Process | Algorithm | Purpose |
|------|----------|------------|----------|
| 1 | **Encryption** | AES-256-CBC | Converts readable data into ciphertext using a secret key and IV. |
| 2 | **Integrity Verification** | SHA-256 | Generates a unique hash value to detect tampering. |
| 3 | **Decryption** | AES-256-CBC | Converts the ciphertext back to the original readable form using the stored key and IV. |

---

## 🧠 Example Flow  

1. User uploads a file (`report.pdf`).  
2. The app generates a **random AES key** and **IV**, encrypts the file locally, and computes a **SHA-256 hash**.  
3. The encrypted text, key, and hash are stored in **localStorage**.  
4. The user can later **decrypt** and **download** the original file using the same key and IV.  

---

## 🚀 Steps to Run the Project  

### 🔹 1. Clone the Repository  
```bash
git clone https://github.com/antonyjohny2203/hybrid-cloud-1OX22CS025-1OX22CS034.git
cd hybrid-cloud/frontend

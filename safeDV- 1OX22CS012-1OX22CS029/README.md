SafeDV

Ashika K & Adithi S

This project presents a simple web-based system that enables victims of domestic violence to send 
distress messages safely, without raising suspicion. The approach hides a secret cry for help inside an 
innocent-looking message (such as a shopping list). The secret part is encrypted using a hybrid 
cryptography method that combines Caesar Cipher and Playfair Cipher. Only authorized organizations 
like NGOs or police, who have the keys, can decrypt and reveal the real message. 
What We Have Done 
1. Webpage Development 
o Built a single-page website with two sections: 
▪ Victim Side: A panel where victims enter a normal-looking cover text and 
their secret message. 
▪ NGO Side: A panel where authorized staff paste the disguised message and 
decrypt it. 
o The site is lightweight, runs locally in the browser, and does not require installation 
or backend servers. 
2. Hybrid Encryption (Caesar + Playfair) 
o Step 1 (Caesar Cipher): The secret message is shifted by a fixed key (e.g., +3). 
o Step 2 (Playfair Cipher): The Caesar output is further encrypted using Playfair with a 
secret keyword. 
o Result: The ciphertext is much harder to analyze compared to using only one cipher. 
3. Message Concealment 
o The encrypted text is disguised under a normal-looking message, such as: 
""" 
Shopping List: Rice, Milk, Bread 
Secret: ZRWQFG 
""" 
o To outsiders, this appears like a normal shopping list. 
o NGOs copy the ciphertext and use the decryption tool to reveal the hidden plea (e.g., 
"HELP ME"). 
4. Decryption Process (NGO Side) 
o Step 1: Apply Playfair decryption using the keyword. 
o Step 2: Apply Caesar decryption with the same shift key. 
o Output: The original secret message is revealed. 
5. Practical Demo 
o Victim enters: 
""" 
Cover: Grocery List - Milk, Eggs, Rice 
Secret: HELP ME 
""" 
o After encryption, ciphertext looks like: 
""" 
Grocery List - Milk, Eggs, Rice 
Secret: UZQW... 
""" 
o NGO decrypts and retrieves: 
""" 
HELP ME 
""" 
Technologies Used 
• Frontend only: HTML, CSS, JavaScript. 
Conclusion 
The project demonstrates how classical hybrid cryptography can be applied to a real social issue. By 
combining Caesar and Playfair ciphers, we created a small but meaningful system that allows safe, 
secret reporting of domestic violence cases. Although not suitable for high-security government use, 
this project shows how encryption can serve society in unique ways. 
Future Scope: 
• Replace classical ciphers with AES or RSA for stronger encryption. 
• Add steganography to hide messages inside images or documents. 
• Expand into a mobile app with panic button and quick erase features for real-world 
deployment.

Copy the index.html file path and paste it in the browser
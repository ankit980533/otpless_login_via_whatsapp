const express = require('express');
const bodyParser = require('body-parser'); 
const jwt = require('jsonwebtoken'); 
const http = require('http');
const path = require('path');
const https = require('https');
require('dotenv').config();
const socketIO = require('socket.io');
const cors=require('cors');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const corsOptions = {
    origin: 'https://otpless-login-via-whatsapp-hggaikk7b-ankit980533s-projects.vercel.app',
    credentials: true 
  };
  app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const users = [
    { id: 1, mobile: '919876543210', verified: false },
    { id: 2, mobile: '919122058062', verified: false }
];

const secretKey = 'secret';
const msg91AuthKey = process.env.AUTH_KEY;

app.post('/login/magic-link', (req, res) => {
    console.log(req.body);
    const { mobile } = req.body;

    const {sessionId}=req.body;
    const user = users.find(user => user.mobile === mobile);

    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }

    if (mobile) {
        io.to(mobile).emit('connectionEstablished');
    }

    const token = jwt.sign({ mobile ,sessionId}, secretKey, { expiresIn: '2h' });


    console.log("token:"+token);

    
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("authkey", msg91AuthKey);
    
    var raw = JSON.stringify({
        "integrated_number": "916353450539",
        "content_type": "template",
        "payload": {
            "to": `${mobile}`,
            "type": "template",
            "template": {
                "name": "magiclink",
                "language": {
                    "code": "en",
                    "policy": "deterministic"
                },
                "components": [
                    {
                        "type": "button",
                        "index": "0",
                        "sub_type": "url",
                        "parameters": [
                            {
                                "type": "text",
                                "text": token
                            }
                        ]
                    }
                ]
            },
            "messaging_product": "whatsapp"
        }
    });
    
   
    
    fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "authkey": msg91AuthKey
        },
        body: raw
    })
    .then(response => response.text())
    .then(result => {
        console.log(result); 
        res.send('Magic link sent successfully.');
    })
    .catch(error => {
        console.error('Error:', error); // Log any errors
        res.status(500).json({ message: 'Error sending magic link.' }); 
    });
    
});

app.get('/login', (req, res) => {
    const token = req.query.token;
   
    console.log(token);

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).json({ message: 'Invalid or expired token.' });
        } else {
            console.log(decoded);
            const mobile = decoded.mobile;
          const sessionId=decoded.sessionId;
          console.log("id" + sessionId);
            const user = users.find(user => user.mobile === mobile);
            if (!user) {
                console.log("user not found") 
                return res.status(404).json({ message: 'User not found.' });
            }

            user.verified = true;
            console.log("Sending test message through socket...");

            io.to(mobile).emit('verificationSuccess', { mobile,sessionId, token });

console.log("message sent");
            res.send('Login successful!');
        }
    });
});
io.on('connection', socket => {
    console.log('A client connected');

    socket.on('storeUserSocket', mobile => {
        console.log(`Storing socket ID for ${mobile}`);
        socket.join(mobile);
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

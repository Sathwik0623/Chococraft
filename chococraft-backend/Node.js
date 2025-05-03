const crypto = require('crypto');
const secret = crypto.randomBytes(64).toString('hex');
console.log(secret);


app.post('/signup', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;
    
    // Ensure passwords match
    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not match');
    }
  
    // Here, you can create a new user and save it in your MongoDB
    try {
      const user = new User({ username, email, password });
      await user.save();
      res.status(201).send('Account successfully created!');
    } catch (error) {
      res.status(500).send('Error creating account');
    }
  });
  
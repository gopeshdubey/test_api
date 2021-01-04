const bcrypt = require('bcryptjs')

var obj = {}

// Method to hash the passsword during registration (encryption)
obj.hashPassword = async (password) => {
    salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password , salt);
    return password;
}


// Method to unhash the password during login (decryption)
obj.decryptPassword = async (password, hashedPassword) => {
    const value =  await bcrypt.compare(password, hashedPassword);
    return value;
}

module.exports = obj;
import mongoose from 'mongoose';

//Creating a User Schema:
const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: [true, "email already exists"],
        required: [true, "email is required"]
    },
    name: {
        type: String,
        unique: [true, "name already exists"],
        required: [true, "name is required"],
        // match: [/^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/, "Username invalid, it should contain 8-20 alphanumeric letters and be unique!"]
    },
    password: {
        type: String,
        required: [true, "password is required"]
    }  
  });
  
  //creating a model based on that schema:
const User = mongoose.model("User", UserSchema);

export default User;
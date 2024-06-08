import mongoose from 'mongoose';

const LikesSchema = new mongoose.Schema ({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true,'']
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: [true,'']
    },   
  }, { timestamps: true });
  
const Likes = mongoose.model("Likes", LikesSchema);

export default Likes;
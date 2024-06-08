import mongoose from 'mongoose';
import { type } from 'os';

const PostSchema = new mongoose.Schema ({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true,'']
    },
    title: {
        type: String,
        requried: [true, "Title is required."]
    },
    post: {
        type: String,
        required: [true, 'Post is required.'],
    },
    likes: {
        type: Number,
        default: 0,
    },
    liked: {
        type: Boolean,
        default: false
    }
  });
  
const Post = mongoose.model("Post", PostSchema);

export default Post;
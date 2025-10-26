import React, { useContext, useState } from 'react'
import axios from 'axios'

import { AuthContext } from '../../context/AuthContext'

const UpdateProfilePic = () => {


    const { user, URL, setUser } = useContext(AuthContext);

    const [imageUrl, setImageUrl] = useState("");
    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!imageUrl) return alert('Enter your image');

        try {
            const res = await axios.put(`${URL}/api/user/profile-pic`, {
                userId: user._id,
                profilePic: imageUrl,
            })

            if (res.status === 200) {
                alert("profile picture updated")
                setUser(res.data.user)
            }
        } catch (error) {
            console.error(error)

        }
    }


    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input type="file" placeholder='Enter image URL' value={imageUrl} onChange={(e) => e.target.value} />
                <button>Update Profile pic</button>
            </form>
        </div>
    )
}

export default UpdateProfilePic
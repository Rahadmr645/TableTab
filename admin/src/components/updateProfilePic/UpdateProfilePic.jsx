import React, { useContext, useState } from 'react'
import axios from 'axios'

import { AuthContext } from '../../context/AuthContext'

const UpdateProfilePic = () => {


    const { user, URL, setUser } = useContext(AuthContext);

    const [imageUrl, setImageUrl] = useState(null);
    
    
    
    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!imageUrl) return alert('Enter your image');
         console.log(user ?  user.id : null)
        try {
          
          // create formate data to send file
          const formData = new FormData();
    
          formData.append('userId', user.id);
          formData.append('profilePic', imageUrl)
          
          for(let [key, value] of
          formData.entries() ) {
            console.log(key, value)
          }
          
            const res = await axios.put(`${URL}/api/user/profile-pic`, formData, {
                headers: { 'Content-Type' : 'multipart/form-Data'},
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
                <input type="file" placeholder='Enter image URL'
                accept="image/*"
                 onChange= {(e) =>  setImageUrl(e.target.files[0])} />
                <button>Update Profile pic</button>
            </form>
        </div>
    )
}

export default UpdateProfilePic
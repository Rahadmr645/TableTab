import React, { useContext, useState } from 'react';
import './Login.css';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const UserRegistration = () => {
  const { currState, setCurrState, setShowLogin, URL, setUser } = useContext(AuthContext);

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    profilePic: '',
    role: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    const endPoint =
      currState === 'SignUp'
        ? `${URL}/api/user/create`
        : `${URL}/api/user/login`;

    const bodyData =
      currState === 'SignUp'
        ? formData
        : { email: formData.email, password: formData.password };
    console.log(bodyData)


    try {
      const res = await axios.post(endPoint, bodyData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = res.data;
      if (res.status === 200) {
        alert('Success');
        console.log(data);
      } else {
        alert('Fail: ' + data.message);
      }

      setUser(res.data.user);
      const token = res.data.token;

      if (token) {
        localStorage.setItem("token", token);
        console.log("token saved:", localStorage.getItem("token"));
      } else {
        console.log("no token found from backend")
      }

      // saving to the localstorage


      setFormData({ username: '', email: '', password: '' });


      navigate('/');
      setShowLogin(false)



    } catch (error) {
      console.error(error);
      alert('Something went wrong: ' + error.message);
    }



  };



  return (
    <div className="loginForm-container">
      <form className="lgoinForm" onSubmit={submitHandler}>
        <div className="login-header">
          <p>{currState}</p>
          <p
            onClick={() => setShowLogin(false)}
            style={{ fontSize: '20px', cursor: 'pointer' }}
          >
            x
          </p>
        </div>

        {currState === 'SignUp' && (
          <div className="mb-3">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              id="username"
              onChange={handleChange}
              name="username"
              value={formData.username}
            />
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email address</label>
          <input
            type="email"
            className="form-control"
            id="email"
            onChange={handleChange}
            name="email"
            value={formData.email}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            id="password"
            onChange={handleChange}
            name="password"
            value={formData.password}
          />
        </div>
        
        <button type="submit" className="btn submitn-btn btn-primary submit-btn">
          Submit
        </button>

        {currState === 'SignUp' ? (
          <p>
            Already have an account?{' '}
            <span className="span" onClick={() => setCurrState('Login')}>
              Click here
            </span>
          </p>
        ) : (
          <p>
            Don't have an account?{' '}
            <span className="span" onClick={() => setCurrState('SignUp')}>
              Click here
            </span>
          </p>
        )}
      </form>
    </div>
  );
};

export default UserRegistration;

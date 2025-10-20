import React from 'react'

import { Routes, Route } from 'react-router-dom';
import Dashbord from './pages/deshboard/Dashbord';
import Login from './pages/login/Login';


import Chefs from './pages/chefs/Chefs';
import Menu from './pages/menu/Menu';
import Orders from './pages/orders/Orders';

const AppRoutes = () => {
    return (
        <>
           
            <Routes>
                <Route path='/' element={<Dashbord />} />
                <Route path='/login' element={<Login />} />
                <Route path='/menu' element={<Menu />} />
                <Route path='/orders' element={<Orders />} />
                <Route path='/chef' element={<Chefs />} />
                
            </Routes>

        </>
    )
}

export default AppRoutes;
import React from 'react'

import { Routes, Route } from 'react-router-dom';
import Dashbord from './pages/deshboard/Dashbord';
import Login from './pages/login/Login';
import Menu from '../../server/models/Menu';
import Order from '../../server/models/OrderModel';
import Chefs from './pages/chefs/Chefs';

const AppRoutes = () => {
    return (
        <>
            <Routes>
                <Route path='/' element={<Dashbord />} />
                <Route path='/login' element={<Login />} />
                <Route path='/menu' element={<Menu />} />
                <Route path='/orders' element={<Order />} />
                <Route path='/chefs' element={<Chefs />} />
                <Route path='/login ' element={<Login />} />
            </Routes>

        </>
    )
}

export default AppRoutes
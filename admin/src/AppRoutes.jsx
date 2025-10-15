import React from 'react'

import { Routes, Route } from 'react-router-dom';
import Dashbord from './pages/deshboard/Dashbord';
import Login from './pages/login/Login';

import Order from '../../server/models/OrderModel';
import Chefs from './pages/chefs/Chefs';
import AddMenuForm from './components/addmenuform/AddMenuForm';

const AppRoutes = () => {
    return (
        <>
            <Routes>
                <Route path='/' element={<Dashbord />} />
                <Route path='/login' element={<Login />} />
                <Route path='/menu' element={<AddMenuForm />} />
                <Route path='/orders' element={<Order />} />
                <Route path='/chefs' element={<Chefs />} />
                <Route path='/login ' element={<Login />} />
            </Routes>

        </>
    )
}

export default AppRoutes;
import React, { useContext } from 'react'
import AddMenuForm from '../../components/addmenuform/AddMenuForm'
import { AuthContext } from '../../context/AuthContext'
import './Menu.css'
const Menu = () => {
  const { showMenuForm, setShowMenuForm } = useContext(AuthContext);
  console.log(showMenuForm)
  return (
    <>
      <div className='menuList-container'>
        {
          showMenuForm ?
            <AddMenuForm />
            : <></>
        }
      <button onClick={() => setShowMenuForm(true)}>addMenu</button>
      </div>
    </>
  )
}

export default Menu
import Menu from "../models/Menu.js"


// creating 01:  new item in menu

export const addMenu = async (req, res) => {
    try {

        const { name, price, description, image, category, options } = req.body;

        // for image
        const imagePath = req.file ? req.file.path : null;

        // validation check 
        if (!name || !price || !description || !category) {
            return res.status(400).json({ message: 'you must be fill all the field' })
        }


      const  newItem = new Menu({
            name,
            price,
            description,
            image: imagePath,
            category,
            options,
        });
        await newItem.save();
        res.status(200).json({ message: "New item added successfully", newMenu: newItem });

    } catch (error) {

        res.status(500).json({ message: "fiald to add new item",  error: error.message });

    }
}


// get 02:  all menu items list

export const getMenu = async (req, res) => {
    try {

        const menuItems = await Menu.find();

        res.status(200).json({ mesasge: "Menu items fetched successfully", MenuList: menuItems })
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch menu items", error: error.messasge })

    }
}



// 03 :   get menu update 
export const menuUpdate = async (req, res) => {

    try {

        const { id } = req.params;
        const updates = req.body;

        const updatedMenu = await Menu.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,

        });


        if (!updatedMenu) {
            return res.status(404).json({ message: "Menu item not found" });
        }



        res.status(200).json({
            message: "Menu items updated successfully",
            date: updatedMenu
        })



    } catch (error) {
        res.status(500).json({ message: "field to update your manu", error: error.message })
    }
}





// 04 : delete menu items
export const deleteMenu = async (req, res) => {
    try {

        const { id } = req.params;
        const deleteMenu = await Menu.findByIdAndDelete(id);

        if (!deleteMenu) {
            return res.status(400).json({ message: "Menu item not found" })

        }

        res.status(200).json({
            message: "menu item delete successfully",
            data: deleteMenu,
        });

    } catch (error) {

        res.status(500).json({ message: "fiald ot delete menuitem", error: error.mesasge })

    }
}
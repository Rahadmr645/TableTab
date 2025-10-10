import Menu from "../models/Menu.js"


// adding new item in menu

export const addMenu = async (req, res) => {
    try {

        const newItem = new Menu(req.body);

        await newItem.save();

        res.status(200).json({ message: "New item added successfully", newItem });

    } catch (error) {

        res.status(500).json({ message: "fiald to add new item", Menu: newItem, error: error.message });

    }
}



// get all menu items list

export const getMenu = async (req, res) => {
    try {

        const menuItems = await Menu.find();

        res.status(200).json({ mesasge: "Menu items fetched successfully", MenuList: menuItems })
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch menu items", error: error.messasge })

    }
}
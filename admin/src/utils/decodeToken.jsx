import { jwtDecode } from 'jwt-decode'



 export const getUserFromToken = () => {

    // get the token from localhost
    const token = localStorage.getItem("token");

    if (!token) return null;

    try {
        const decoded = jwtDecode(token);
        console.log("decode",decoded)
        // check is token expired
        if (decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem("token");
            return null;
        }

        return decoded;
    } catch (error) {
        console.error("invalid token:", error)
        return null;

    }


}

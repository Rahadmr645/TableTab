import QRCode from 'qrcode';


export const generatorTableQR = async (tableId) => {
    try {
        const url = `${process.env.FRONTEND_URL}/menu/${tableId}`;
        const qrImage - await QRCode.toDataURL(url);
        return qrImage;

    } catch (error) {
        console.log(error)
    }
}
import jwt from 'jsonwebtoken';

const check = (req, res, next)=>{
    const {auth} = req.headers;
    if(!auth){
        return;
    }
    try {
        const check = jwt.verify(auth, process.env.JWT_SECRET);
        req.users = check;
        next();
    } catch (error) {
        console.log(error);
        return;
    }
}

export {check};
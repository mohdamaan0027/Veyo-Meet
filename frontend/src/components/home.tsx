import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Home () {

    const location = useLocation();
    const user = location.state?.user;
    const navigate = useNavigate();

     console.log('home check')

    useEffect(()=>{
        if(!user){
            navigate('/auth')
        }
        console.log('from home:', user);
    }, [user])
    
    return (
    <>
        <h1>Home</h1>
    </>
    )
}

export default Home;
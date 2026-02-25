import { Outlet } from "react-router-dom";
import AuthNavbar from "../components/AuthNavbar";

const AuthLayout = () => {

    return <>
        <AuthNavbar />
        <Outlet />;
    </>
}

export default AuthLayout;
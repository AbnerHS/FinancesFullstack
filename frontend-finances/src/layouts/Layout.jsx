import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const Layout = () => {

    return <>
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <main className="mx-auto py-6 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    </>
}

export default Layout;
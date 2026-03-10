import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const Navbar = () => {

    const { user } = useAuthStore();
    const navigate = useNavigate();

    const onLogout = () => {
        useAuthStore.getState().clearTokens();
        navigate("/login");
    }

    return <>
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <span className="text-2xl font-bold text-indigo-600">Finances</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-indigo-700">{user?.name?.substr(0, 1)}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                        </div>
                        <button
                            onClick={() => onLogout()}
                            className="ml-4 px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 focus:outline-none cursor-pointer"
                        >
                            Sair
                        </button>

                    </div>
                </div>
            </div>
        </header>

    </>
}

export default Navbar;
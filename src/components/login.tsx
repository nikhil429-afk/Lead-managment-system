import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./login.module.css";
import tx from './transition.module.css'

interface FormData {
    email: string;
    pwd: string;
}

interface ErrorData {
    email?: string;
    pwd?: string;
    general?: string;
}

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/> <circle cx="12" cy="12" r="2"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/> <circle cx="12" cy="12" r="2"/> <line x1="4" y1="4" x2="20" y2="20"/>
  </svg>
);

function LogIn() {
    
    const navigate = useNavigate();

    const [form, setForm] = useState<FormData>({
        email: "",
        pwd: "",
    });

    const [error, setError] = useState<ErrorData>({});
    const [message, setMessage] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [transitionState, setTransitionState] = useState<"idle" | "exiting">("idle");


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value });
    };


    const handleNavigation = () => {
        setTransitionState("exiting");
        setTimeout(() => navigate("/register"), 250);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const newError: any = {};
        if (!form.email) newError.email = "Email is required!";
        if (!form.pwd) newError.pwd   = "Password is required!";
        setError(newError);
        
        if (Object.keys(newError).length !== 0) return;

        try {
            const res = await fetch("http://127.0.0.1:8000/login", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: form.email, pwd: form.pwd }),
            });

            const data = await res.json();
            
            if (!res.ok) {
                if (typeof data.detail === "object") {
                    setError(data.detail);
                } else {
                    setError({ general: data.detail || "Login failed" });
                }
                return;
            }

            const token = data.token;
            const user = data.user;
            const role = user.role.toLowerCase();
            
            switch(role){

                case "admin":
                    localStorage.setItem("admin_token", token);
                    localStorage.setItem("admin_user", JSON.stringify(user));
                    navigate("/admin");
                    break;

                case "manager":
                    localStorage.setItem("manager_token", token);
                    localStorage.setItem("manager_user", JSON.stringify(user));
                    navigate("/manager");
                    break;

                case "user":
                    localStorage.setItem("user_token", token);
                    localStorage.setItem("user_user", JSON.stringify(user));
                    navigate("/user");
                    break;

                default:
                    console.error("Invalid Role:", user.role);
                    break;
            }
        }
        catch (err) {
            console.log(err);
            setError({ general: "Login Failed" });
            setMessage("");
        }
    };

    const containerClass = [
        styles.container,
        transitionState === "exiting" ? tx.exitToLeft : tx.enterFromRight,
    ].join(" ");

    return (
        <div className={styles.pageWrapper}>
            <form onSubmit={handleSubmit} className={containerClass}>

                <div className={styles.heading}>
                    <div className={styles.badge}>Welcome Back</div>
                    <h2 className={styles.cardTitle} data-text="Log In"> Log In </h2>
                    <p className={styles.subText}>Good To See You Again — Sign in To Continue</p>
                    <div className={styles.accentLine}></div>
                </div>

                <div className={`${styles.field} ${error.email ? styles.error : ""}`}>
                    <label className={styles.label}>Email Address : </label>
                    <input name="email" value={form.email} className={styles.input} onChange={handleChange} placeholder="john@example.com" />
                    {error.email && ( <div className={styles.errMsg}>
                        <span className={styles.errDot}></span>
                        {error.email}
                        </div>
                    )}
                </div>

                <div className={`${styles.field} ${styles.hasIcon} ${error.pwd ? styles.error : ""}`}>
                    <label className={styles.label}>Password : </label>
                    <input type={showPwd ? "text" : "password"} name="pwd" value={form.pwd} className={styles.input}
                        onChange={handleChange} placeholder="Enter Your Password" />
                    <span className={styles.fieldIcon} onClick={() => setShowPwd(!showPwd)} >
                        {showPwd ? <EyeIcon /> : <EyeOffIcon />}
                    </span>
                    {error.pwd && ( <div className={styles.errMsg}>
                        <span className={styles.errDot}></span>
                        {error.pwd}
                        </div>
                    )}
                </div>

                <button type="submit" className={styles.button}> Log In → </button>

                {message && <p className={styles.successMessage}>{message}</p>}
                {error.general && <p className={styles.errorMessage}>{error.general}</p>}

                <div className={styles.footer}>
                    <span className={styles.footerTxt}> Don't Have An Account? </span>
                    <button type="button" onClick={handleNavigation} className={`${styles.link} ${tx.linkRipple}`} >
                        Sign Up <span className={styles.linkArrow}>→</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default LogIn;

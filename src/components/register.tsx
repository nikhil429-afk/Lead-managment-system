import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./register.module.css";
import tx from './transition.module.css';


interface FormData {
    username: string;
    email: string;
    pwd: string;
    conf_pwd: string;
}

interface ErrorData {
    username?: string;
    email?: string;
    pwd?: string;
    conf_pwd?: string;
    general?: string;
}

function Register() {
    
    const [form, setForm] = useState<FormData>({
        username: "",
        email: "",
        pwd: "",
        conf_pwd: "",
    });

    const [error, setError] = useState<ErrorData>({});
    const [message, setMessage] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showConfPwd, setShowConfPwd] = useState(false);
    const [transitionState, setTransitionState] = useState<"idle" | "exiting">("idle");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const navigate = useNavigate();

    const handleNavigation = () => {
        setTransitionState("exiting");
        setTimeout(() => navigate("/login"), 250);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const newError: any = {};
        if (!form.username) newError.username = "Username is required!";
        if (!form.email) newError.email = "Email is required!";
        if (!form.pwd) newError.pwd = "Password is required!";
        if (!form.conf_pwd) {
            newError.conf_pwd = "Your Confirmed Password is required!";
        }
        if (form.conf_pwd && form.pwd !== form.conf_pwd) {
            newError.conf_pwd = "Passwords Didn't Match!";
        }

        setError(newError);
        if (Object.keys(newError).length !== 0) return;

        try {
            const res = await fetch("http://127.0.0.1:8000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: form.username,
                    email: form.email,
                    pwd: form.pwd,
                    conf_pwd: form.conf_pwd,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.detail || { general: "Registration Failed" });
                setMessage("");
            } else {
                setMessage(data.message);
                setError({});
                setForm({ username: "", email: "", pwd: "", conf_pwd: "" });
            }
        } catch (err) {
            setError({ general: "Server Error" });
        }
    };

    const containerClass = [
        styles.container,
        transitionState === "exiting" ? tx.exitToRight : tx.enterFromLeft,
    ].join(" ");

    return (
        <div className={styles.pageWrapper}>
            <form onSubmit={handleSubmit} className={containerClass}>

                <div className={styles.heading}>
                    <h2 className={styles.cardTitle} data-text="Create Account"> Create Account </h2>
                    <p className={styles.subText}>Sign up and Glow Up your life with US.</p>
                    <div className={styles.accentLine}></div>
                </div>

                <div className={`${styles.field} ${error.username ? styles.error : ""}`}>
                    <label className={styles.label}>Username : </label>
                    <input name="username" value={form.username} className={styles.input} onChange={handleChange} placeholder="e.g. Johndoe" />
                    {error.username && ( <div className={styles.errMsg}>
                            <span className={styles.errDot}></span>
                            {error.username}
                        </div>
                    )}
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
                    <label className={styles.label}>Password :</label>
                    <input type={showPwd ? "text" : "password"} name="pwd" value={form.pwd} className={styles.input}
                        onChange={handleChange} placeholder="Min. 8 characters" />
                    <span className={styles.fieldIcon} onClick={() => setShowPwd(!showPwd)} >
                        {showPwd ? "🫣" : "👁️"}
                    </span>
                    {error.pwd && ( <div className={styles.errMsg}>
                            <span className={styles.errDot}></span>
                            {error.pwd}
                        </div>
                    )}
                </div>

                <div className={`${styles.field} ${styles.hasIcon} ${error.conf_pwd ? styles.error : ""}`}>
                    <label className={styles.label}>Confirm Password :</label>
                    <input type={showConfPwd ? "text" : "password"} name="conf_pwd" value={form.conf_pwd} className={styles.input}
                        onChange={handleChange} placeholder="Re-Enter your password" />
                    <span className={styles.fieldIcon} onClick={() => setShowConfPwd(!showConfPwd)} >
                        {showConfPwd ? "🫣" : "🔒"}
                    </span>

                    {error.conf_pwd && (
                        <div className={styles.errMsg}>
                            <span className={styles.errDot}></span>
                            {error.conf_pwd}
                        </div>
                    )}
                </div>

                <button type="submit" className={styles.button}> Create Account </button>

                {message && <p className={styles.successMessage}>{message}</p>}
                {error.general && <p className={styles.errorMessage}>{error.general}</p>}

                <div className={styles.footer}>
                    <span className={styles.footerTxt}>Already Have An Account?</span>
                    <button type="button" onClick={handleNavigation} className={`${styles.link} ${tx.linkRipple}`} >
                        Log In <span className={styles.linkArrow}> → </span>
                    </button>
                </div>

            </form>
        </div>
    );
}

export default Register;

import React from "react";
import { Link } from "react-router-dom";
import "./About.css";

const About = () => {
  return (
    <div className="about-page">
      <section className="about-card">
        <h1>About TableTab</h1>
        <p>
          TableTab is built for venues that want a calm, premium ordering layer on
          top of the kitchen rhythm—clear menus, confident payments, and live
          visibility for guests.
        </p>
        <Link className="about-back" to="/menu">
          Back to menu
        </Link>
      </section>
    </div>
  );
};

export default About;

import React from 'react';
import { assets } from '../../assets/assets';
import SearchBar from '../../components/student/SearchBar';

const Hero = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full md:pt-18 pt-20 px-12 md:px-0 space-y-7 text-center bg-gradient-to-b from-cyan-100/70">
      <h1 className="md:text-home-heading-large text-home-heading-small relative font-bold text-gray-800 max-w-3xl mx-auto">
        Fuel your ambition with learning
        <span className="text-blue-600"> that fits your path.</span>
        <img src={assets.sketch} alt="sketch" className="md:block hidden absolute -bottom-7 right-0" />
      </h1>
      <p className="md:block hidden text-gray-500 max-w-2xl mx-auto">
        Welcome to <b>SkillSync,</b> your all-in-one learning platform.<br/>We offer a wide range of expertly crafted courses to help you succeed—anytime, anywhere. Start learning today and take control of your future.
      </p>
      <p className="md:hidden text-gray-500 max-w-sm mx-auto">
        Welcome to <b>SkillSync,</b> your all-in-one learning platform where knowledge meets opportunity.
      </p>
      <SearchBar />
    </div>
  );
};

export default Hero;

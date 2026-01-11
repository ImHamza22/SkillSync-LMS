import React from 'react';
import Footer from '../../components/student/Footer';
import Hero from '../../components/student/Hero';
import CoursesSection from '../../components/student/CoursesSection';
import CallToAction from '../../components/student/CallToAction';
import FAQSection from '../../components/student/FAQSection';

const Home = () => {

  return (
    <div className="flex flex-col items-center space-y-7 text-center">
      <Hero />
      <CoursesSection />
      <FAQSection />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Home;

import React, { useState } from "react";

const faqs = [
  {
    question: "What is SkillSync LMS?",
    answer:
      "SkillSync is an online learning platform where instructors can create courses and students can enroll, track their progress, and learn at their own pace."
  },
  {
    question: "How do I enroll in a course?",
    answer:
      "Open the course details page, click on the enroll or buy button, and complete the payment on the secure checkout page. Once the payment is successful, the course will appear in your My Enrollments section."
  },
  {
    question: "Can I track my learning progress?",
    answer:
      "Yes. As you complete lectures, your progress is updated automatically. You can see your completion percentage for each course in the My Enrollments page and inside the course player."
  },
  {
    question: "How do I become an instructor?",
    answer:
      "Sign in to your account, click on the 'Teach on SkillSync' button in the navigation bar, and follow the instructions. Your account role will be upgraded to instructor so you can start creating courses."
  },
  {
    question: "Which payment methods are supported?",
    answer:
      "Payments are processed securely via Stripe. The available payment methods depend on your region, but typically include major debit and credit cards."
  }
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleIndex = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faq"
      className="w-full max-w-5xl mx-auto px-4 py-16 lg:py-20"
    >
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
          Frequently Asked Questions
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">
          Find answers to common questions about courses, enrollment, and
          teaching on SkillSync.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={index}
              className="border border-gray-200 rounded-xl bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleIndex(index)}
                className="w-full flex items-center justify-between px-4 md:px-6 py-4 md:py-5 text-left"
              >
                <span className="font-medium text-sm md:text-base text-gray-900">
                  {item.question}
                </span>
                <span className="ml-4 flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-500 text-lg leading-none">
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 md:px-6 pb-4 md:pb-5 border-t border-gray-100">
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FAQSection;

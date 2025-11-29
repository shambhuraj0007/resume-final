"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Send, Loader2, MapPin, Clock, Phone } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Message Sent!",
          description: "Thank you for contacting us. We'll get back to you soon.",
        });
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Get in Touch
          </h1>
         
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            <Card className="border-blue-200 dark:border-blue-800 shadow-lg">
              <CardHeader>
                
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Email</p>
                    <p className="text-gray-600 dark:text-gray-300">hello@shortlistAI.xyz</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Response Time</p>
                    <p className="text-gray-600 dark:text-gray-300">Within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Location</p>
                    <p className="text-gray-600 dark:text-gray-300">Available Worldwide</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 dark:border-purple-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
                  <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  What can we help with?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li>• Resume building assistance</li>
                  <li>• ATS optimization questions</li>
                  <li>• Technical support</li>
                  <li>• Feature requests</li>
                  <li>• Partnership inquiries</li>
                  <li>• General feedback</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="border-slate-200 dark:border-slate-700 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 dark:text-white">
                  Send us a Message
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-300">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your.email@example.com"
                        className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="What's this about?"
                      className="border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us more about how we can help you..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-vertical min-h-[120px]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <Card className="border-green-200 dark:border-green-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-green-900 dark:text-green-100">
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    How quickly will I get a response?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    We typically respond within 24 hours during business days. For urgent matters, please mention it in your subject line.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Do you offer phone support?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Currently, we provide support via email only. This allows us to give you detailed, written responses that you can reference later.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Can you help with resume reviews?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Yes! Our ATS checker provides detailed feedback, and our team can offer additional guidance through this contact form.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Is there a cost for support?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Basic support is completely free. We're here to help you succeed with your resume and job search.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

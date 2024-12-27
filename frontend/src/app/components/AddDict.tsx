"use client";

import React, { useState, useEffect } from "react";

const AddDict = ({ term, define }) => {
  const [username, setUsername] = useState("");
  const [sentence, setSentence] = useState("");
  const [message, setMessage] = useState("");
  const [add, setAdd] = useState(false);

  useEffect(() => {
    setUsername(localStorage.getItem("username"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Term entered: ", term);
    console.log("Definition: ", define);
    console.log("Example sentence", sentence);
    const res = await fetch("http://localhost:8080/dictionary", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, term, define, sentence }),
    });
    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div>
      {!add && message.length == 0 && (
        <button className="mt-16" onClick={() => setAdd(true)}>
          Add to personal dictionary?
        </button>
      )}
      {add && (
        <div className="flex flex-col justify-center items-center mx-auto space-y-4 mt-8">
          <label htmlFor="addItem">Example sentence? (optional)</label>
          <input
            id="addItem"
            type="text"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
          />
          <button className="border rounded-md p-2" onClick={handleSubmit}>
            Add
          </button>
        </div>
      )}
      {message && (
        <p className="text-green-100 flex items-center justify-center mx-auto mt-8">
          {message}
        </p>
      )}
    </div>
  );
};

export default AddDict;
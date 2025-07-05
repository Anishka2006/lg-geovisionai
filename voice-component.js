import { speech } from "../utils/speech.mjs";
import { flytoview } from "../api/flytoview.mjs";
import { startOrbit } from "../api/orbit.mjs";
import { stopOrbit } from "../api/orbit.mjs";

export class LGVoice extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    const template = document.createElement("template");
    template.innerHTML = `
      <style>
        .wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          block-size: 100dvh;
          padding-inline: 30px;
          padding-block-end: 100px;
        }

        .scrollable-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-height: 100%;
          overflow-y: auto;
          padding-block: 20px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .scrollable-content::-webkit-scrollbar {
          display: none;
        }

        p {
          color: var(--md-sys-color-on-background);
          font-size: clamp(1rem, 1.5vw + 0.2rem, 1.2rem);
        }

        .headline-small {
          font-size: clamp(1.2rem, 2vw + 0.3rem, 1.5rem);
          font-weight: 500;
          color: var(--md-sys-color-on-background);
        }

        .body-medium {
          font-size: clamp(0.95rem, 1.2vw + 0.2rem, 1rem);
          color: var(--md-sys-color-on-background);
        }

        md-icon-button { 
          scale: 5;
          margin-block: 80px;
          background-color: color-mix(in srgb, 95% transparent, 5% var(--md-sys-color-on-surface-variant));
          border-radius: 50%;
          z-index: 1;
          cursor: pointer;
        }

        .mic path {
          fill: var(--md-sys-color-primary-container);
        }

        .message {
          inline-size: 100%;
          block-size: 75px;
          overflow-y: scroll;
          word-break: break-word;
          scrollbar-width: none;
          text-align: center;
          color: var(--md-sys-color-tertiary-container);
        }

        .story {
          inline-size: 100%;
          block-size: 200px;
          overflow-y: auto;
          word-break: break-word;
          scrollbar-width: none;
          -ms-overflow-style: none;
          text-align: center;
          color: var(--md-sys-color-on-background);
          margin-block-start: 10px;
          padding: 5px;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 8px;
          background-color: var(--md-sys-color-surface-container-low);
        }

        .story::-webkit-scrollbar {
          display: none;
        }

        .manual-input {
          display: flex;
          flex-direction: column; /* Keeps text field and button stacked */
          gap: 10px;
          margin-block-start: 10px;
          inline-size: 100%;
          max-inline-size: 500px;
          color: var(--md-sys-color-tertiary-container);
        }


        .manual-input md-filled-text-field {
            flex-grow: 1;
        }

        .manual-input md-filled-button {
            width: 100%; /* Make the Ask AI button full width */
        }

        audio {
          margin-block-start: 20px;
          inline-size: 100%;
          outline: none;
          border-radius: 8px;
          background-color: var(--md-sys-color-surface-container-high);
          box-shadow: var(--md-elevation-level1);
        }

        .orbit-buttons {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
        }

        .orbit-buttons md-filled-button {
          flex: 1;
        }

        .location-info {
          margin-block-start: 10px;
          padding: 8px 12px;
          background-color: var(--md-sys-color-surface-container);
          border-radius: 8px;
          font-size: 0.9rem;
          color: var(--md-sys-color-on-surface);
          text-align: center;
          border: 1px solid var(--md-sys-color-outline-variant);
        }

        .ripple::after {
          position: absolute;
          inset-inline-start: 50%;
          inset-block-start: 50%;
          translate: -50% -50%;
          content: "";
          background-color: color-mix(in srgb, 95% transparent, 5% var(--md-sys-color-on-surface-variant));
          border-radius: 50%;
          z-index: -1;
          animation: ripple 0.8s ease-in-out alternate infinite;
        }

        .ending.ripple::after {
          animation: endRipple 0.5s ease;
        }

        @keyframes ripple {
          0%   { inline-size: 50px; block-size: 50px; }
          25%  { inline-size: 45px; block-size: 45px; }
          50%  { inline-size: 40px; block-size: 40px; }
          75%  { inline-size: 55px; block-size: 55px; }
          100% { inline-size: 50px; block-size: 50px; }
        }

        @keyframes endRipple {
          to { inline-size: 40px; block-size: 40px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ripple::after {
            animation: none !important;
          }
        }
        @media (max-width: 600px) {
          .wrapper { padding-inline: 16px; }
          md-icon-button { scale: 3; margin-block: 40px; }
          .manual-input {
              max-inline-size: 100%;
              align-items: stretch;
          }
          .headline-small { font-size: clamp(1rem, 1.5vw + 0.3rem, 1.3rem); }

          .manual-input md-filled-button {
              width: 100%; 
          }
        }

        @media (min-width: 601px) and (max-width: 1024px) {
          .wrapper { padding-inline: 40px; }
          md-icon-button { scale: 4; }
        }

        @media (min-width: 1025px) {
          .wrapper { max-inline-size: 800px; margin-inline: auto; }
        }

        .message { display: block; }
        .message:empty { display: none; }
      </style>

      <div class="wrapper">
        <md-icon-button id="micButton" aria-label="Microphone">
            <svg class="mic" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="m12 15c1.66 0 3-1.31 3-2.97v-7.02c0-1.66-1.34-3.01-3-3.01s-3 1.34-3 3.01v7.02c0 1.66 1.34 2.97 3 2.97z"></path>
                <path d="m11 18.08h2v3.92h-2z"></path>
                <path d="m7.05 16.87c-1.27-1.33-2.05-2.83-2.05-4.87h2c0 1.45 0.56 2.42 1.47 3.38v0.32l-1.15 1.18z"></path>
                <path d="m12 16.93a4.97 5.25 0 0 1 -3.54 -1.55l-1.41 1.49c1.26 1.34 3.02 2.13 4.95 2.13 3.87 0 6.99-2.92 6.99-7h-1.99c0 2.92-2.24 4.93-5 4.93z"></path>
            </svg>
        </md-icon-button>
        <p class="headline-small">Tap on the Mic to Speak/Stop AI Narration</p>
        <p class="body-medium message"></p>
        <p class="body-medium story" id="story"></p>

        <div class="location-info" id="locationInfo" style="display: none;">
          <strong>Current Location:</strong> <span id="currentLocationName">None</span><br>
          <strong>Coordinates:</strong> <span id="currentCoordinates">None</span>
        </div>

        <slot name="voice"></slot>

        <div class="manual-input">
          <md-filled-text-field
            id="questionInput"
            label="Or type your question here..."
            value="">
          </md-filled-text-field>

          <md-filled-button id="submitButton">Ask AI</md-filled-button>

          <div class="orbit-buttons">
            <md-filled-button id="startOrbitButton">Start Orbit</md-filled-button>
            <md-filled-button id="stopOrbitButton">Stop Orbit</md-filled-button>
          </div>

        </div>
        <audio id="soundPlayer" controls hidden></audio>
      </div>
    `;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const micButton = this.shadowRoot.getElementById("micButton");
    const questionInput = this.shadowRoot.getElementById("questionInput");
    const submitButton = this.shadowRoot.getElementById("submitButton");
    const voiceAnimation = document.querySelector(".googleVoice");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Web Speech API is not supported in this browser.");
      this.showToast("Your browser does not support voice recognition.");
      micButton.disabled = true;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let isRecognizing = false;

    micButton.addEventListener("click", () => {
      if (isRecognizing) {
        recognition.stop();
        isRecognizing = false;
        this.showToast("");
        this.removeAnimations();
      } else {
        recognition.start();
        isRecognizing = true;
        this.showToast("Start Speaking...");
        micButton.classList.add("ripple");
        voiceAnimation?.classList?.add("animate");
        speech.stop(); // Stop any ongoing narration if mic is tapped
      }
    });

    submitButton.addEventListener("click", () => {
      const typed = questionInput.value.trim();
      if (typed !== "") {
        this.processQuery(typed);
        questionInput.value = "";
        speech.stop(); // Stop any ongoing narration when a new query is submitted
      }
    });

    const startOrbitButton = this.shadowRoot.getElementById("startOrbitButton");
    const stopOrbitButton = this.shadowRoot.getElementById("stopOrbitButton");

    // Stores the last coordinates after each Gemini location extraction
    this.lastCoordinates = null;
    this.lastLocationName = null;

    startOrbitButton.addEventListener("click", async () => {
      if (!this.lastCoordinates) {
        this.showToast("No location available for orbit. Please search for a location first.");
        return;
      }

      const { lat, lng } = this.lastCoordinates;
      console.log("Starting orbit at:", lat, lng, "for location:", this.lastLocationName);
      
      try {
        this.showToast(`Starting orbit around ${this.lastLocationName}...`);
        await startOrbit(lat, lng, 10);
        this.showToast(`Orbit started around ${this.lastLocationName}!`);
      } catch (error) {
        console.error("Start Orbit Error:", error);
        this.showToast("Failed to start orbit.");
      }
    });

    stopOrbitButton.addEventListener("click", async () => {
      try {
        await stopOrbit();
        this.showToast("Orbit stopped.");
      } catch (error) {
        console.error("Stop Orbit Error:", error);
        this.showToast("Failed to stop orbit.");
      }
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      this.processQuery(transcript);
      isRecognizing = false;
      this.removeAnimations();
    };

    recognition.onspeechend = () => {
      recognition.stop();
      isRecognizing = false;
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.showToast("You didn't say anything, try again.");
      isRecognizing = false;
      this.removeAnimations();
    };

    //Integrated AI Narration of the story generated by AI using text to speech
    speech.initTTS();
  }

  removeAnimations() {
    const micButton = this.shadowRoot.getElementById("micButton");
    const voiceAnimation = document.querySelector(".googleVoice");

    micButton.classList.add("ending");
    voiceAnimation?.classList?.add("ending");
    setTimeout(() => {
      micButton.classList.remove("ripple", "ending");
      voiceAnimation?.classList?.remove("animate", "ending");
    }, 1200);
  }

  showToast(message) {
    const toast = this.shadowRoot.querySelector(".message");
    toast.textContent = message;
    if (message) {
      toast.style.display = 'block';
    } else {
      toast.style.display = 'none';
    }
  }

  // Update location info display
  updateLocationInfo(locationName, coordinates) {
    const locationInfo = this.shadowRoot.getElementById("locationInfo");
    const locationNameSpan = this.shadowRoot.getElementById("currentLocationName");
    const coordinatesSpan = this.shadowRoot.getElementById("currentCoordinates");
    
    if (locationName && coordinates) {
      locationNameSpan.textContent = locationName;
      coordinatesSpan.textContent = `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`;
      locationInfo.style.display = 'block';
    } else {
      locationInfo.style.display = 'none';
    }
  }

  // Select the best location result from OpenCage API results
  selectBestLocationResult(results, originalQuery) {
    // Prefer results that match the original query more closely
    const lowerQuery = originalQuery.toLowerCase();
    
    // Score each result based on how well it matches the query
    const scoredResults = results.map(result => {
      const formatted = result.formatted.toLowerCase();
      const components = result.components;
      
      let score = 0;
      
      // Higher score for exact matches in name components
      if (components.city && lowerQuery.includes(components.city.toLowerCase())) score += 10;
      if (components.country && lowerQuery.includes(components.country.toLowerCase())) score += 8;
      if (components.state && lowerQuery.includes(components.state.toLowerCase())) score += 6;
      if (components.county && lowerQuery.includes(components.county.toLowerCase())) score += 4;
      if (components.town && lowerQuery.includes(components.town.toLowerCase())) score += 7;
      if (components.village && lowerQuery.includes(components.village.toLowerCase())) score += 5;
      
      // Higher score for confidence
      if (result.confidence >= 8) score += 5;
      else if (result.confidence >= 6) score += 3;
      else if (result.confidence >= 4) score += 1;
      
      return { result, score };
    });
    
    // Sort by score (highest first) and return the best match
    scoredResults.sort((a, b) => b.score - a.score);
    console.log("Location scoring results:", scoredResults);
    
    return scoredResults[0].result;
  }

  // Fetches coordinates from OpenCage API based on the provided location query
  async getCoordinatesFromLocation(locationQuery, openCageApiKey) {
    if (!locationQuery || locationQuery.trim() === "") {
        return null;
    }

    const encodedQuery = encodeURIComponent(locationQuery);
    const OPENCAGE_API_ENDPOINT = `https://api.opencagedata.com/geocode/v1/json?q=${encodedQuery}&key=${openCageApiKey}&pretty=0&no_annotations=1&limit=5`;

    try {
        const response = await fetch(OPENCAGE_API_ENDPOINT);
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`OpenCage API failed: ${response.status} - ${errorBody.status?.message || JSON.stringify(errorBody)}`);
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            // Log all results for debugging
            console.log("OpenCage API Results:", data.results.map(r => ({
                formatted: r.formatted,
                components: r.components,
                geometry: r.geometry,
                confidence: r.confidence
            })));
            
            // Use the first result but prefer more specific results
            const bestResult = this.selectBestLocationResult(data.results, locationQuery);
            console.log("Selected best result:", bestResult);
            return { lat: bestResult.geometry.lat, lng: bestResult.geometry.lng };
        } else {
            console.warn(`No results found for location: ${locationQuery}`);
            return null;
        }
    } catch (error) {
        console.error("Error calling OpenCage API:", error);
        return null;
    }
  }

  //Handling queries like take me to... and show me... along with general queries for Gemini
  async processQuery(query) {
    const storyEl = this.shadowRoot.getElementById("story");
    const soundPlayer = this.shadowRoot.getElementById("soundPlayer");
  
    this.showToast("Processing your question...");
    soundPlayer.hidden = true;
    storyEl.textContent = "";
    let imageUrl = ""; // for dynamically generating image ,left on hold for now
  
    const showOnlyPattern = /^take me to\s+|^show me\s+/i;
    let geminiTextResponse = "";
    let identifiedLocation = "";
    const isDirectLocation = showOnlyPattern.test(query.trim());
  
    const googleGeminiApiKey = localStorage.getItem("gemmaApiKey");
    const openCageApiKey = localStorage.getItem("openCageApiKey");
    const freesoundApiKey = localStorage.getItem("freesoundApiKey");
  
    if (!googleGeminiApiKey || !openCageApiKey || !freesoundApiKey) {
      this.showToast("Please enter and save all API keys in the Settings tab to proceed.");
      this.removeAnimations();
      return;
    }
  
    if (isDirectLocation) {
      identifiedLocation = query.replace(/^(take me to|show me)\s+/i, "").trim();
      geminiTextResponse = `You're now viewing ${identifiedLocation}.`;
      storyEl.textContent = geminiTextResponse;
      this.showToast(`Detected direct location command: "${identifiedLocation}"`);
      speech.speak(geminiTextResponse, () => {
        this.showToast("Story narration finished.");
      });
    } else {
      //Gemini API call
      const MODEL_NAME = "models/gemini-1.5-flash-latest";
      const GOOGLE_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${googleGeminiApiKey}`;
  
      try {
        this.showToast("Getting response from Google Gemini...");
  
        const geminiAnswerRes = await fetch(GOOGLE_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 250,
              topP: 0.9,
              topK: 40,
            },
          }),
        });
  
        const geminiAnswerData = await geminiAnswerRes.json();
        geminiTextResponse = geminiAnswerData.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Google Gemini.";
        if (!geminiTextResponse || geminiTextResponse.trim() === "") {
          this.showToast("Gemini returned an empty response.");
          this.removeAnimations();
          return;
        }
  
        storyEl.textContent = geminiTextResponse;
        this.showToast("Narrating story...");
        speech.speak(geminiTextResponse, () => {
          this.showToast("Story narration finished.");
        });
  
        //Improved function to ask Gemini to extract the location from the response
        const geminiLocationRes = await fetch(GOOGLE_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `
                You are a location extraction expert. Extract the most specific and main geographic location mentioned in the context.
                
                Original Question: "${query}"
                AI Response: """${geminiTextResponse}"""
                
                Rules:
                1. Return only the most specific location name (city, landmark, or region)
                2. If multiple locations are mentioned, return the PRIMARY one that the user is most likely interested in
                3. Include country/state if the location name is ambiguous (e.g., "Paris, France" vs "Paris, Texas")
                4. Return "N/A" if no specific location is mentioned
                5. Do not include descriptive words, only the location name
                6. For landmarks, include the city/country (e.g., "Eiffel Tower, Paris, France")
                7. For natural features, be specific (e.g., "Mount Everest, Nepal" not just "Everest")
                
                Examples:
                - "Tell me about the Eiffel Tower" → "Eiffel Tower, Paris, France"
                - "What's the weather in Tokyo?" → "Tokyo, Japan"
                - "Show me the Amazon rainforest" → "Amazon rainforest, Brazil"
                - "Tell me about Rome" → "Rome, Italy"
                - "What about the Great Wall?" → "Great Wall of China, China"
                
                Location:
                `
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 100,
              topP: 0.9,
              topK: 40,
            },
          }),
        });
  
        const geminiLocationData = await geminiLocationRes.json();
        identifiedLocation = geminiLocationData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "N/A";
  
        if (!identifiedLocation || identifiedLocation.toLowerCase() === "n/a") {
          this.showToast("No valid location extracted from Gemini.");
          this.removeAnimations();
          return;
        }
        
        console.log("Extracted location from Gemini:", identifiedLocation);
      } catch (error) {
        console.error("Gemini API error:", error);
        this.showToast(`Gemini error: ${error.message}`);
        this.removeAnimations();
        return;
      }
    }
  
    //Function for location fetching and handling (for both direct calls and Gemini queries)
    try {
      this.showToast(`Fetching coordinates for: ${identifiedLocation}...`);
      const fixedLocations = {
        "amazon rainforest": { lat: -3.4653, lng: -62.2159 },
        "amazon rainforest, brazil": { lat: -3.4653, lng: -62.2159 },
        "sahara desert": { lat: 23.4162, lng: 25.6628 },
        "sahara desert, africa": { lat: 23.4162, lng: 25.6628 },
        "himalayas": { lat: 28.5983, lng: 83.9311 },
        "himalayas, nepal": { lat: 28.5983, lng: 83.9311 },
        "antarctica": { lat: -82.8628, lng: 135.0000 },
        "pacific ocean": { lat: 0.0, lng: -160.0 },
        "atlantic ocean": { lat: 0.0, lng: -30.0 },
        "ganges river": { lat: 25.3097, lng: 83.0104 },
        "ganges river, india": { lat: 25.3097, lng: 83.0104 },
        "great barrier reef": { lat: -18.2871, lng: 147.6992 },
        "great barrier reef, australia": { lat: -18.2871, lng: 147.6992 },
        "eiffel tower": { lat: 48.8584, lng: 2.2945 },
        "eiffel tower, paris": { lat: 48.8584, lng: 2.2945 },
        "eiffel tower, paris, france": { lat: 48.8584, lng: 2.2945 },
        "statue of liberty": { lat: 40.6892, lng: -74.0445 },
        "statue of liberty, new york": { lat: 40.6892, lng: -74.0445 },
        "great wall of china": { lat: 40.4319, lng: 116.5704 },
        "great wall of china, china": { lat: 40.4319, lng: 116.5704 },
        "machu picchu": { lat: -13.1631, lng: -72.5450 },
        "machu picchu, peru": { lat: -13.1631, lng: -72.5450 },
        "taj mahal": { lat: 27.1751, lng: 78.0421 },
        "taj mahal, india": { lat: 27.1751, lng: 78.0421 },
        "grand canyon": { lat: 36.1069, lng: -112.1129 },
        "grand canyon, usa": { lat: 36.1069, lng: -112.1129 },
        "mount everest": { lat: 27.9881, lng: 86.9250 },
        "mount everest, nepal": { lat: 27.9881, lng: 86.9250 },
        "niagara falls": { lat: 43.0962, lng: -79.0377 },
        "niagara falls, canada": { lat: 43.0962, lng: -79.0377 },
        "golden gate bridge": { lat: 37.8199, lng: -122.4783 },
        "golden gate bridge, san francisco": { lat: 37.8199, lng: -122.4783 },
        "sydney opera house": { lat: -33.8568, lng: 151.2153 },
        "sydney opera house, australia": { lat: -33.8568, lng: 151.2153 }
      };
  
      let coordinates;
      const key = identifiedLocation.toLowerCase();
      
      // Check if it's a fixed location first (exact match)
      if (fixedLocations[key]) {
        coordinates = fixedLocations[key];
        console.log("Using fixed coordinates for exact match:", identifiedLocation, coordinates);
      } else {
        // Check if the location contains any of the fixed location names
        const matchingFixedLocation = Object.keys(fixedLocations).find(fixedKey => {
          const fixedKeyWords = fixedKey.split(/[,\s]+/);
          const queryWords = key.split(/[,\s]+/);
          
          // Check if main landmark/location name matches
          return fixedKeyWords.some(fixedWord => 
            queryWords.some(queryWord => 
              queryWord.includes(fixedWord) || fixedWord.includes(queryWord)
            )
          );
        });
        
        if (matchingFixedLocation) {
          coordinates = fixedLocations[matchingFixedLocation];
          console.log("Using fixed coordinates for similar location:", matchingFixedLocation, coordinates);
        } else {
          coordinates = await this.getCoordinatesFromLocation(identifiedLocation, openCageApiKey);
          console.log("Using OpenCage API coordinates for:", identifiedLocation, coordinates);
        }
      }
  
      if (coordinates) {
        // Validate coordinates are reasonable
        if (coordinates.lat < -90 || coordinates.lat > 90 || coordinates.lng < -180 || coordinates.lng > 180) {
          throw new Error("Invalid coordinates received");
        }
        
        this.lastCoordinates = coordinates;
        this.lastLocationName = identifiedLocation; // Store the location name for reference
        console.log("Updated lastCoordinates:", this.lastCoordinates, "for location:", this.lastLocationName); 
        
        // Update the location info display
        this.updateLocationInfo(identifiedLocation, coordinates);
        
        this.showToast(`Flying to ${identifiedLocation}...`);
        await flytoview(coordinates.lat, coordinates.lng, 10);
        imageUrl = await this.generateImageUrlFromText(geminiTextResponse);
  
        const balloonKml = this.generateBalloonKml(coordinates, identifiedLocation, geminiTextResponse);
        await this.sendBalloonToLG(balloonKml);
        
        await flytoview(coordinates.lat, coordinates.lng, 2); // forces the balloon to appear
        
        this.showToast(`Ready to orbit ${identifiedLocation}. Coordinates: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`);
      } else {
        this.showToast(`No coordinates found for "${identifiedLocation}".`);
      }
    } catch (error) {
      console.error("Location processing error:", error);
      this.showToast(`Error processing location: ${error.message}`);
    } finally {
      this.removeAnimations();
    }
  }
  
  //function for generating image dynamically, kept on hold for now
  async generateImageUrlFromText(text) {
    const cleaned = text
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .split(" ")
      .slice(0, 50)
      .join(" ");
  
    const config = {
      type: "wordcloud",
      data: { text: cleaned }
    };
  
    const encoded = encodeURIComponent(JSON.stringify(config));
    return `https://quickchart.io/chart?c=${encoded}&encoding=base64`;
  }
  
  // sanitize special characters that can/may break the KML rendering
  sanitizeForKML(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  
  generateBalloonKml(coordinates, name, geminiTextResponse) {
    const fallbackImage = "https://anishka2006.github.io/lg-geovisionai/high-detail-political-map-of-the-world-blue-and-white-vector.jpg";
    const safeText = this.sanitizeForKML(geminiTextResponse); 
  
    return `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2"
        xmlns:gx="http://www.google.com/kml/ext/2.2"
        xmlns:kml="http://www.opengis.net/kml/2.2"
        xmlns:atom="http://www.w3.org/2005/Atom">
      <Document>
        <Style id="custom_pin">
          <IconStyle>
            <Icon>
              <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
            </Icon>
          </IconStyle>
          <BalloonStyle>
            <text>$[description]</text>
            <bgColor>ffffffff</bgColor>
          </BalloonStyle>
        </Style>
  
        <Placemark>
          <name>${name}</name>
          <description><![CDATA[
            <div style="width:500px; padding:20px; font-family:sans-serif; text-align:center; font-size:18px;">
              <h2 style="font-size:26px; margin-bottom:15px; font-weight:bold; color:#000;">${name}</h2>
              <img src="${fallbackImage}" alt="Map" width="460" height="280" style="margin-bottom:15px;" />
              
              <div style="font-size:18px; color:#000; margin-bottom:10px;">
                <b>Latitude:</b> ${coordinates.lat} &nbsp;&nbsp; | &nbsp;&nbsp; <b>Longitude:</b> ${coordinates.lng}
              </div>
  
              <div style="max-height:300px; overflow-y:scroll; text-align:left; margin-top:10px; padding:10px; font-size:22px; line-height:1.5; border-top:2px solid #333; color:#111; scrollbar-width:auto; scrollbar-color:#888 #f1f1f1;">
                ${safeText}
              </div>
  
              <style>
                ::-webkit-scrollbar {
                  width: 10px;
                }
                ::-webkit-scrollbar-thumb {
                  background-color: #888;
                  border-radius: 5px;
                }
                ::-webkit-scrollbar-track {
                  background-color: #f1f1f1;
                }
              </style>
            </div>
          ]]></description>
          <styleUrl>#custom_pin</styleUrl>
          <gx:balloonVisibility>1</gx:balloonVisibility>
          <Point>
            <coordinates>${coordinates.lng},${coordinates.lat},0</coordinates>
          </Point>
        </Placemark>
      </Document>
    </kml>`;
  }
  
  // Sends the dynamically generated Balloon KML to Liquid Galaxy
  async sendBalloonToLG(kmlContent) {
    try {
      const configs = JSON.parse(localStorage.getItem("lgconfigs"));

      if (!configs || !configs.server || !configs.username || !configs.ip || !configs.port || !configs.password || !configs.screens) {
        this.showToast("Liquid Galaxy connection settings are incomplete. Please check settings.");
        console.error("LG configuration missing for balloon sending.");
        return;
      }

      const { server, username, ip, port, password, screens } = configs;
      const ENDPOINT_SHOW_BALLOON = "/api/lg-connection/show-balloon";

      this.showToast("Sending balloon to Liquid Galaxy...");

      const response = await fetch(server + ENDPOINT_SHOW_BALLOON, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          ip,
          port,
          password,
          screens,
          kml: kmlContent,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Balloon sent successfully:", result.message, result.data);
        this.showToast("Balloon Placemark displayed on Liquid Galaxy!");
      } else {
        console.error("Error sending balloon:", result.message, result.stack);
        this.showToast(`Failed to display Balloon: ${result.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error during balloon sending:", error);
      this.showToast(`Error sending balloon: ${error.message}`);
    }
  }

  // keyword extraction function for integrating freesound API, will look into it after midterm
  extractKeywords(text) {
    const keywords = ["ocean", "sea", "river", "lake", "wave", "storm", "tsunami", "coast", "island", "flood", "beach",
                      "forest", "mountain", "city", "jungle", "desert", "rain", "wind", "thunder", "bird", "animal", "music", "ambience", "nature", "urban", "waterfall", "desert", "crowd", "street"];
    for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword)) {
            return keyword;
        }
    }
    return null;
  }
}

customElements.define("lg-voice", LGVoice);
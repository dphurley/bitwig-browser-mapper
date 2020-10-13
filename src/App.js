import React, {useEffect, useState} from 'react';
import './App.css';
import {useDropzone} from "react-dropzone";
import Papaparse from "papaparse"
import webmidi from "webmidi"

function App() {

  const [lastReceivedMidiCC, setLastReceivedMidiCC] = useState(null)
  const [webmidiDisabled, setWebmidiDisabled] = useState(false)
  const [selectedMidiInput, setSelectedMidiInput] = useState(null)
  const [midiInputs, setMidiInputs] = useState([])
  const [fileContents, setFileContents] = useState(null)
  const [mappingForIndex, setMappingForIndex] = useState(null)

  const {getRootProps, getInputProps, open, acceptedFiles} = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxFiles: 1
  })

    useEffect(() => {
        const selectedFile = acceptedFiles[0]
        if(!!selectedFile) {
            const reader = new FileReader()

            reader.onabort = () => console.log('file reading was aborted')
            reader.onerror = () => console.log('file reading has failed')
            reader.onload = () => {
                const csvString = reader.result
                const parsedFile = Papaparse.parse(csvString, {
                    delimiter: ",",
                    header: false
                })
                setFileContents(parsedFile.data)
            }
            reader.readAsBinaryString(selectedFile)
        }
    }, [acceptedFiles])

    useEffect(() => {
        webmidi.enable(function (err) {
            if (err && !webmidiDisabled) {
                console.log("WebMidi could not be enabled.", err);
                setWebmidiDisabled(true);
            }

            setMidiInputs(webmidi.inputs)
        });
    })

    const selectMidiInput = (inputId) => {
        const input = webmidi.getInputById(inputId);

        input.addListener('controlchange', "all", (midiMessage) => {
            setLastReceivedMidiCC({
                channel: midiMessage.channel,
                cc: midiMessage.controller.number,
                value: midiMessage.value
            })
        });

        setSelectedMidiInput(input)
    }

    const enableMappingForControl = (index) => {
        setMappingForIndex(index)
    }

    const finishMapping = () => {
        setMappingForIndex(-1)
    }

    useEffect(() => {
        if(mappingForIndex >= 0 && !!lastReceivedMidiCC) {
            fileContents[mappingForIndex][2] = lastReceivedMidiCC.channel
            fileContents[mappingForIndex][3] = lastReceivedMidiCC.cc
        }
    }, [lastReceivedMidiCC])

  return (
      <div className="container">

          <div>
              {webmidiDisabled ? (
                  <div>MIDI does not work in this browser!</div>
              ) : (
                  <div>
                      <div>MIDI Inputs:</div>
                      <div>
                          {
                            midiInputs.map((input) => {
                                const backgroundColor = !!selectedMidiInput && input.id === selectedMidiInput.id ? "lightgray" : "white";
                                  return (
                                      <div key={input.name} >
                                          <button
                                              style={{backgroundColor}}
                                              onClick={() => selectMidiInput(input.id)}
                                          >
                                              {input.name}
                                          </button>
                                      </div>
                                  )
                            })
                          }
                      </div>
                  </div>
              )}
          </div>
        <div {...getRootProps({className: 'dropzone'})}>
          <input {...getInputProps()} />
          <p>Drag CSV parameter file here</p>
          <button type="button" onClick={open}>
            Open File
          </button>
        </div>
        <aside>
          <h4>Parameters</h4>
            {fileContents && fileContents.map((parameter, index) => (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        backgroundColor: "white",
                        borderLeftColor: "black"
                    }}
                    key={parameter[1]}
                >
                    <div style={{width: "150px", padding: "10px"}}>
                        {parameter[0]}
                    </div>
                    <div style={{width: "150px", padding: "10px"}}>
                        {parameter[1]}
                    </div>
                    <div style={{width: "150px", padding: "10px"}}>
                        {"MIDI Channel: " + parameter[2]}
                    </div>
                    <div style={{width: "150px", padding: "10px"}}>
                        {"MIDI CC: " + parameter[3]}
                    </div>
                    <div style={{width: "150px", padding: "10px"}}>
                        {
                            mappingForIndex === index ? (
                                <button onClick={finishMapping}>Done</button>
                            ) : (
                                <button onClick={() => enableMappingForControl(index)}>Learn</button>
                            )
                        }

                    </div>
                </div>


            ))}
        </aside>
      </div>
  )
}

export default App;

import * as onnx from 'onnxjs';
// import * as pako from 'pako';
// import * as nifti from 'nifti-js';

const nifti = require('nifti-js');
const pako = require('pako');
// const nifti = require('nifti-js');

// Function to process MRI file
async function processMRI() {
  // Get the file from the input
  const file = document.getElementById('inputFile').files[0];

  // Check if the file has the correct extension
  if (!file.name.endsWith('.nii') && !file.name.endsWith('.nii.gz')) {
    alert('Please select a .nii or .nii.gz file.');
    return;
  }

  // Read the file
  const reader = new FileReader();
  reader.onload = async function (e) {
    // Read MRI volume
    const buffer = e.target.result;

    // Check if the file is compressed and decompress if needed
    let decompressedBuffer;
    if (file.name.endsWith('.gz')) {
      decompressedBuffer = pako.inflate(new Uint8Array(buffer));
    } else {
      decompressedBuffer = new Uint8Array(buffer);
    }
    const niftiFile = nifti.readHeader(decompressedBuffer.buffer);

    // Check dimensions
    if (niftiFile.dims[0] !== 256 || niftiFile.dims[1] !== 256 || niftiFile.dims[2] !== 256) {
      alert('The input file must have dimensions 256^3.');
      return;
    }

    // Get MRI volume
    const volume = new Float32Array(nifti.readImage(niftiFile));

    // Load ONNX model
    const session = new onnx.InferenceSession();
    await session.loadModel('model.onnx');

    // Apply the model
    const inputTensor = new onnx.Tensor(volume, [1, 256, 256, 256]);
    const outputMap = await session.run([inputTensor]);
    const outputData = outputMap.values().next().value.data;

    // Convert to int format
    const intOutputData = new Int32Array(outputData.length);
    for (let i = 0; i < outputData.length; i++) {
      intOutputData[i] = Math.round(outputData[i]);
    }

    // Create a new NIFTI file
    const outputNiftiFile = nifti.cloneNifti(niftiFile);
    outputNiftiFile.image = intOutputData;

    // Create a download link
    const blob = new Blob([nifti.writeNifti(outputNiftiFile)], { type: 'application/octet-stream' });
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'output.nii';
    downloadLink.style.display = 'block';
  };
};

window.processMRI = processMRI;

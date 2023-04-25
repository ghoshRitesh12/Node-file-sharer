(function () {

	const socket = io();
	let sender_uid;

	function globalEvl(type, selector, callback) {
		document.addEventListener(type, e => { 
			if(e.target.matches(selector)) callback(e) 
		});
	}

	const docMap = {
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
	}


	let fileCopies;
	let filePages;

	// cost of each printable copy
	const eachPageCost = 2;

	function generateID() {
		return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
	}

	document.querySelector("#receiver-start-con-btn").addEventListener("click", function () {
		sender_uid = document.querySelector("#join-id").value;
		if (sender_uid.length == 0) {
			return;
		}
		let joinID = generateID();
		socket.emit("receiver-join", {
			sender_uid: sender_uid,
			uid: joinID
		});
		document.querySelector(".join-screen").classList.remove("active");
		document.querySelector(".fs-screen").classList.add("active");
	});

	let fileShare = {};

	socket.on("fs-meta", function (metadata) {
		fileShare.metadata = metadata;
		fileShare.transmitted = 0;
		fileShare.buffer = [];

		let el = document.createElement("div");
		el.classList.add("item");
		el.innerHTML = `
			<div class="progress">0%</div>
			<div class="filename">${metadata.filename}</div>
			<form class="print" hidden style="margin-top: 2rem">
				<label style="display: block; margin-block: .5rem;">
					Select no of copies to print
				</label>
				<input type="number" placeholder="no of copies" class="copies">
				<input type="number" placeholder="no of pages" class="pages" style="margin-top: .5rem">
				<button type="submit">
					Continue
				</button>
			</form>
		`;
		document.querySelector(".files-list").appendChild(el);

		fileShare.progrss_node = el.querySelector(".progress");

		socket.emit("fs-start", {
			uid: sender_uid
		});
	});

	socket.on("fs-share", function (buffer) {
		fileShare.buffer.push(buffer);
		fileShare.transmitted += buffer.byteLength;
		fileShare.progrss_node.innerText = Math.trunc(fileShare.transmitted / fileShare.metadata.total_buffer_size * 100) + "%";

		if (fileShare.transmitted == fileShare.metadata.total_buffer_size) {
			fileShare.progrss_node.parentElement.querySelector('.print').removeAttribute('hidden')

		} else {
			socket.emit("fs-start", {
				uid: sender_uid
			});
		}
	});



	async function printFile() {
		const blob = new Blob(fileShare.buffer, { type: fileShare.metadata.file_type });
		const blobUrl = URL.createObjectURL(blob);

		const printWindow = window.open(blobUrl, '_blank', 'width=1000,height=800')
		console.log('printing file');
		printWindow.onload = function () {
			setTimeout(() => {
				printWindow.print();
				URL.revokeObjectURL(blobUrl);
			}, 100)
		};

		fileShare = {};

	}


	// function downloadFile() {
	//   download(new Blob(fileShare.buffer), fileShare.metadata.filename);
	// }

	globalEvl('submit', '.print', e => {

		e.preventDefault();
		fileCopies = parseInt(e.target.querySelector('.copies').value) || 1;
		filePages = parseInt(e.target.querySelector('.pages').value) || 1;
		console.log(fileCopies);
	
		document.querySelector('#copies_no').innerText = fileCopies;
		document.querySelector('#pages_no').innerText = filePages;
		document.querySelector('#copies_cost').innerText = fileCopies * (filePages * eachPageCost);
	
		document.querySelector('#pay-req').removeAttribute('hidden');
		document.querySelector('#pay-req img').setAttribute('src', '../paymentQRCode.jpg');

		e.target.closest('.item').style.pointerEvents = 'none';
		e.target.closest('.item').style.backgroundColor = 'rgb(206, 206, 206)';

		document.querySelector('.app').style.overflowY = 'hidden';
	})


	document.querySelector('#pay-req').addEventListener('submit', async e => {
		e.preventDefault();
		await printFile()
		document.querySelector('#pay-req').setAttribute('hidden', '');
		document.querySelector('#pay-req img').removeAttribute('src');
		document.querySelector('.app').style.overflowY = 'auto';
	})


})();

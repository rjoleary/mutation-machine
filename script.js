var desired, evolving;
var fitness = 0.0;
var generations = 0;
var timer;

// constants
var BASES = "ACGT";
var BASE_VALUES = {A: 0, C: 1, G: 2, T: 3};
var GENES_REGEX = /ATG(...)*?(TAA|TGA|TAG)/g;
var DEFAULT_DNA = "ATGGATTCGGCTGTAAACGATACTCTACGGCAGTACTGA";
var WIDTH = 250;
var HEIGHT = 250;


window.onload = function ()
{
	desired = document.getElementById("desired").getContext("2d");
	evolving = document.getElementById("evolving").getContext("2d");
	document.getElementById("desired").width = document.getElementById("evolving").width = WIDTH;
	document.getElementById("desired").height = document.getElementById("evolving").height = HEIGHT;

	document.getElementById("start").disabled = false;
	document.getElementById("stop").disabled = true;
	
	document.getElementById("dna").onkeyup = ResetFitness;
	document.getElementById("dna").onchange = ResetFitness;
	
	ChangeImage("frillmore.png");

	document.getElementById("image-upload").addEventListener('change', FileSelected, false);
}

function FileSelected(e)
{
	// get the file
    var file = e.target.files[0];
    
	if (file && file.type.match('image.*'))
	{
		// read the image
		var reader = new FileReader();
		reader.onload = function(e)
		{
			ChangeImage(e.target.result);
		};
		reader.readAsDataURL(file);
	}
}

function ChangeImage(source)
{
	var newImage = new Image();
	newImage.width = WIDTH;
	newImage.height = HEIGHT;
	newImage.onload = function ()
	{
		desired.clearRect(0, 0, WIDTH, HEIGHT);
		desired.drawImage(newImage, 0, 0, WIDTH, HEIGHT);
		ResetDNA();
	};
	newImage.src = source;
}

function WeightedRandom(weights)
{
	var sum = 0;
	for (var weight in weights)
		sum += parseInt(weight);
	
	var rand = Math.floor(Math.random() * sum);
	for (var weight in weights)
	{
		if (rand < parseInt(weight))
			return weights[weight];
		rand -= parseInt(weight);
	}
	// execution should never get here
}

function MutateDNA(dna)
{
	for (var n = Math.ceil(Math.pow(Math.random(), 10) * 10); n > 0; n--)
	{
		var i = Math.floor(Math.random() * dna.length);
		
		var mutations = {
			// point
			990: function ()
			{
				dna = dna.substr(0, i) + BASES[Math.floor(Math.random()*BASES.length)] + dna.substr(i + 1);
			},
			// insertion
			4: function ()
			{
				var length = Math.ceil(10 * Math.pow(Math.random(), 2));
				var insert = "";
				for (var j = 0; j < length; j++)
					insert += BASES[Math.floor(Math.random()*BASES.length)];
				dna = dna.substr(0, i) + insert + dna.substr(i);
				i += length;
			},
			// deletion
			5: function ()
			{
				var length = Math.ceil(10 * Math.pow(Math.random(), 2));
				dna = dna.substr(0, i) + dna.substr(i + length);
			},
			// duplication
			1: function ()
			{
				var length = Math.ceil(20 * Math.pow(Math.random(), 4));
				dna = dna.substr(0, i) + dna.substr(i, Math.max(i + length, dna.length)) + dna.substr(i);
			}
		};
		
		WeightedRandom(mutations)();
	}
	
	return dna
}

function ConvertCodon(codon)
{
	return 16 * BASE_VALUES[codon[0]] + 4 * BASE_VALUES[codon[1]] + BASE_VALUES[codon[2]];
}

function PolygonProtein(aminoAcids)
{
	var h = 0, s = 0, l = 0, a = 0;
	
	var startX = aminoAcids[1] / 64 * WIDTH;
	var startY = aminoAcids[2] / 64 * HEIGHT;
	
	evolving.beginPath();
	evolving.moveTo(startX + aminoAcids[4] - 32, startY + aminoAcids[5] - 32);
	
	// TODO: separate color loop from shape loop
	for (var i = 3; i < aminoAcids.length; i += 3)
	{
		var x = startX + aminoAcids[i+1] - 32;
		var y = startY + aminoAcids[i+2] - 32;
		evolving.lineTo(x, y);
		
		var c = aminoAcids[i] % 16;
		switch (Math.floor(aminoAcids[i] / 16) % 4)
		{
			case 0:
				h += c;
				break;
			case 1:
				s += c;
				break;
			case 2:
				l += c;
				break;
			case 3:
				a += c;
				break;
		}
	}
	evolving.fillStyle = "hsla(" + (h * 17) + "," +
	                               (100 - s % 17 / 17.0 * 100) + "%," +
	                               (100 - l % 17 / 17.0 * 100) + "%," +
	                               (1.0 - a % 17 / 17.0) + ")";
	evolving.fill();
}

function DrawDNA(dna)
{
	// clear the canvas
	evolving.clearRect(0, 0, WIDTH, HEIGHT);
	
	var genes = dna.match(GENES_REGEX);
	
	if (genes !== null)
	{
		for (var i = 0; i < genes.length; i++)
		{
			// remove end codon
			var gene = genes[i].slice(0, -3);
		
			// separate codons
			var codons = gene.match(/.../g);
		
			// create amino acids
			var aminoAcids = [];
			for (var j = 0; j < codons.length; j++)
			{
				aminoAcids.push(ConvertCodon(codons[j]));
			}
			
			if (aminoAcids.length >= 9 && aminoAcids.length <= 21)
				PolygonProtein(aminoAcids);
		}
	}
}

function CalculateFitness()
{
	var d = desired.getImageData(0, 0, WIDTH, HEIGHT).data;
	var r = evolving.getImageData(0, 0, WIDTH, HEIGHT).data;

	var fitness = 0.0;
	for (var i = 0; i < d.length; i++)
		fitness += Math.abs(d[i] - r[i]) / 255;
	
	fitness /= 250 * 250 * 4;
	return 1 - fitness;
}

function StartMutate()
{
	document.getElementById("start").disabled = true;
	document.getElementById("stop").disabled = false;

	// get the dna
	var dna = document.getElementById("dna").value;
	
	if (dna.length === 0)
	{
		dna = DEFAULT_DNA;
	}
	else
	{
		dna = MutateDNA(dna);
		var maxLength = 10000;
		if (dna.length > maxLength)
			dna = dna.substr(dna.length - maxLength)
	}
	
	DrawDNA(dna);
	
	// update fitness and dna
	var newFitness = CalculateFitness();
	if ((newFitness > fitness) ||
	    (newFitness == fitness && Math.random() < 0.001) ||
	    (newFitness == fitness && dna.length < document.getElementById("dna").value.length && Math.random() < 0.001))
	{
		fitness = newFitness;
		document.getElementById("dna").value = dna;
		document.getElementById("fitness").innerHTML = Math.round(fitness * 10000) / 100;
		generations++;
		document.getElementById("generations").innerHTML = generations;
	}
	
	timer = window.setTimeout(StartMutate, 1);
}

function StopMutate()
{
	document.getElementById("stop").disabled = true;
	document.getElementById("start").disabled = false;

	clearTimeout(timer);
	DrawDNA(document.getElementById("dna").value);
}

function ResetDNA()
{
	document.getElementById("dna").value = "";
	fitness = 0.0;
	document.getElementById("fitness").innerHTML = 0;
	generations = 0;
	document.getElementById("generations").innerHTML = 0;
	
	DrawDNA(document.getElementById("dna").value);
}

function CleanDNA()
{
	var dna = document.getElementById("dna");
	var genes = dna.value.match(GENES_REGEX);
	
	if (genes !== null)
		dna.value = genes.join("");
	else
		dna.value = "";
}

function ResetFitness()
{
	DrawDNA(document.getElementById("dna").value);

	fitness = CalculateFitness();
	document.getElementById("fitness").innerHTML = Math.round(fitness * 10000) / 100;
}


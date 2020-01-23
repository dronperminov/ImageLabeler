function Labeler(labels, colors) {
	this.diff = 5

	this.labels = labels
	this.colors = colors

	this.startPoint = null
	this.endPoint = null
	this.currBox = null
	this.entities = []
	this.entities_boxes = []

	this.moveIndex = -1
	this.movePoint = null

	this.resizeIndex = -1
	this.resizeType = null
	this.resizePoint = null

	this.isBlocked = false

	this.img = $('.labeler-image')

	this.offsetLeft = this.img.offset().left
	this.offsetTop = this.img.offset().top
}

Labeler.prototype.get_point = function(e) {
	return { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop }
}

Labeler.prototype.get_box = function(startPoint, endPoint, label = "") {
	x = Math.min(startPoint.x, endPoint.x)
	y = Math.min(startPoint.y, endPoint.y)

	width = Math.abs(startPoint.x - endPoint.x)
	height = Math.abs(startPoint.y - endPoint.y)

	return { 
		label: label,
		x: x,
		y: y,
		width: width,
		height: height
	}
}

Labeler.prototype.get_box_index = function(x, y) {
	for (let i = 0; i < this.entities.length; i++) {
		let box = this.entities[i]

		if (x >= box.x + this.diff && y >= box.y + this.diff && x <= box.x + box.width - this.diff && y <= box.y + box.height - this.diff)
			return i
	}

	return -1
}

Labeler.prototype.check_line = function(x, y, x1, y1, x2, y2) {
	if (x1 == x2)
		return x > x1 - this.diff && x < x1 + this.diff && y >= y1 && y <= y2

	if (y1 == y2)
		return y > y1 - this.diff && y < y1 + this.diff && x >= x1 && x <= x2

	return false
}

Labeler.prototype.get_box_resize_index = function(x, y) {
	for (let i = 0; i < this.entities.length; i++) {
		let box = this.entities[i]

		if (this.check_line(x, y, box.x, box.y, box.x, box.y + box.height))
			return { index: i, type: 1 }
			
		if (this.check_line(x, y, box.x, box.y, box.x + box.width, box.y))
			return { index: i, type: 2 }

		if (this.check_line(x, y, box.x + box.width, box.y, box.x + box.width, box.y + box.height))
			return { index: i, type: 3 }
			
		if (this.check_line(x, y, box.x, box.y + box.height, box.x + box.width, box.y + box.height))
			return { index: i, type: 4 }
	}

	return null
}

Labeler.prototype.show_entities = function() {
	let image = $('.labeler-image img')
	let name = image.attr("src")
	let index = name.lastIndexOf('/')

	if (index > -1)
		name = name.substring(index)

	width = image.width()
	height = image.height()

	let tmp = []

	for (let i = 0; i < this.entities.length; i++) {
		tmp.push({
			label: this.entities[i].label,
			x: Math.max(0, this.entities[i].x / width),
			y: Math.max(0, this.entities[i].y / height),
			width: Math.min(this.entities[i].width / width, 1),
			height: Math.min(this.entities[i].height / height, 1),
		})
	}

	$("#entities-data").text(JSON.stringify({ name: name, entities: tmp }, null, "  "));
}

Labeler.prototype.get_color = function(label, opacity = false) {
	return "rgba(" + this.colors[this.labels.indexOf(label)] + (opacity ? ", 0.15" : "") + ")"
}

Labeler.prototype.boxes_hover = function(p) {
	let index = this.get_box_index(p.x, p.y)

	for (let i = 0; i < this.entities.length; i++)
		this.entities_boxes[i].css('outline', "2px solid " + this.get_color(this.entities[i].label))

	if (index != -1) {
		this.entities_boxes[index].css('outline', "2px dashed #ffbc00")
		$("body").css('cursor', "pointer")
		return
	}

	$("body").css('cursor', "default")

	let resizing = this.get_box_resize_index(p.x, p.y)

	if (resizing != null) {
		this.entities_boxes[resizing.index].css('outline', "2px dashed #ffbc00")

		if (resizing.type == 1 || resizing.type == 3)
			$("body").css('cursor', "w-resize")
		else
			$("body").css('cursor', "s-resize")
	}
}

Labeler.prototype.start_labeling = function() {
	let select = $('<select id="label-select"><option>Select label</option><option>' + labels.join("</option><option>") + '</option></select>')
	select.appendTo(this.currBox)
	select.css({
		"position" : "absolute",
		"top" : this.endPoint.y - Math.min(this.startPoint.y, this.endPoint.y) + "px",
		"left" : this.endPoint.x - Math.min(this.startPoint.x, this.endPoint.x) + "px",
	})

	select.focus()
	this.isBlocked = true
	let labeler = this;

	select.change(function() {
		labeler.end_labeling(select)
	})

	select.keydown(function(e) {
		let option = parseInt(e.key)

		if (Number.isInteger(option) && option > 0 && option <= labeler.labels.length) {
			select.prop('selectedIndex', option)
			labeler.end_labeling(select)
		}
	})
}

Labeler.prototype.end_labeling = function(select) {
	let label = select.val()

	this.currBox.css("background", this.get_color(label, true))
	this.currBox.css("outline", "2px solid " + this.get_color(label))

	let text = $("<p>" + label + "</p>")
	text.css({
		"position" : "relative",
		"text-align" : "center",
		"margin" : "0",
		"color" : this.get_color(label)
	})

	select.remove()
	text.appendTo(this.currBox)

	this.entities.push(this.get_box(this.startPoint, this.endPoint, label))
	this.entities_boxes.push(this.currBox)

	this.startPoint = null
	this.endPoint = null
	this.isBlocked = false
	this.show_entities()
}

Labeler.prototype.is_valid = function(p) {
	let imageWidth = $(".labeler-image img").width()
	let imageHeight = $(".labeler-image img").height()
	let dst = this.moveIndex == -1 && this.resizeIndex == -1 ? this.diff : 0;

	if (p.x < -dst || p.y < -dst || p.x > imageWidth + dst || p.y > imageHeight + dst)
		return false

	return true
}

Labeler.prototype.remove_all = function() {
	if (this.entities.length > 0 && confirm("Remove all: are you sure?")) {
		for (let i = 0; i < this.entities_boxes.length; i++)
			this.entities_boxes[i].remove()

		this.entities = []
		this.entities_boxes = []
		this.show_entities()
	}
}

Labeler.prototype.mousedown = function(e) {
	if (this.isBlocked)
		return

	let p = this.get_point(e)

	if (!this.is_valid(p))
		return

	let index = this.get_box_index(p.x, p.y)
	let resizing = this.get_box_resize_index(p.x, p.y)

	if (e.button == 0) {
		if (index == -1 && resizing == null) {
			this.startPoint = { x: p.x, y: p.y }
			this.currBox = $('<div class="label-box" draggable=false></div>')
			this.currBox.appendTo(this.img)
			this.moveIndex = -1
		}
		else if (index != -1) {
			this.movePoint = { x: p.x, y: p.y }
			this.currBox = this.entities_boxes[index]
			this.moveIndex = index
		}
		else {
			this.resizePoint = { x: p.x, y: p.y }
			this.currBox = this.entities_boxes[resizing.index]
			this.resizeIndex = resizing.index
			this.resizeType = resizing.type
		}
	}
	else if (e.button == 2) {
		if (index == -1 && resizing != null)
			index = resizing.index

		if (index == -1)
			return

		this.entities_boxes[index].remove()
		this.entities.splice(index, 1)
		this.entities_boxes.splice(index, 1)
	}

	this.show_entities()
}

Labeler.prototype.mouseup = function(e) {
	if (e.button != 0)
		return

	if (this.isBlocked) {
		if (e.target.tagName != "SELECT" && e.target.tagName != "OPTION") {
			this.currBox.remove()
			this.startPoint = null
			this.endPoint = null
			this.isBlocked = false
		}

		return
	}

	if (this.startPoint != null && this.moveIndex == -1 && this.resizeIndex == -1) {
		this.endPoint = this.get_point(e)

		let imageWidth = $(".labeler-image img").width()
		let imageHeight = $(".labeler-image img").height()

		if (this.endPoint.x > imageWidth)
			this.endPoint.x = imageWidth

		if (this.endPoint.y > imageHeight)
			this.endPoint.y = imageHeight

		let width = Math.abs(this.startPoint.x - this.endPoint.x)
		let height = Math.abs(this.startPoint.y - this.endPoint.y)

		if (width < this.diff || height < this.diff) {
			this.currBox.remove()
			this.startPoint = null
			this.endPoint = null
			return
		}

		this.start_labeling()
	}

	this.moveIndex = -1
	this.resizeIndex = -1
	this.show_entities()
}

Labeler.prototype.mousemove = function(e) {
	if (this.isBlocked)
		return

	let p = this.get_point(e)

	if (this.startPoint == null && this.moveIndex == -1 && this.resizeIndex == -1) {
		this.boxes_hover(p)
		return
	}

	if ((this.moveIndex > -1 || this.resizeIndex > -1) && !this.is_valid(p))
		return

	let imageWidth = $(".labeler-image img").width()
	let imageHeight = $(".labeler-image img").height()
	let box = null

	if (this.moveIndex > -1) {
		let dx = p.x - this.movePoint.x
		let dy = p.y - this.movePoint.y

		this.movePoint.x = p.x
		this.movePoint.y = p.y

		box = this.entities[this.moveIndex]
		box.x += dx
		box.y += dy
	}
	else if (this.resizeIndex > -1) {
		let dx = p.x - this.resizePoint.x
		let dy = p.y - this.resizePoint.y

		this.resizePoint.x = p.x
		this.resizePoint.y = p.y

		box = this.entities[this.resizeIndex]

		if (this.resizeType == 1) {
			box.x += dx
			box.width -= dx
		}
		else if (this.resizeType == 2) {
			box.y += dy
			box.height -= dy
		}
		else if (this.resizeType == 3) {
			box.width += dx
		}
		else if (this.resizeType == 4) {
			box.height += dy
		}
		
		if (box.height < 1) 
			this.resizeType = this.resizeType == 2 ? 4 : 2;

		if (box.width < 1) 
			this.resizeType = this.resizeType == 3 ? 1 : 3;
	}
	else {
		point = { x: p.x, y: p.y }

		if (!this.is_valid(p)) {
			if (point.x > imageWidth)
				point.x = imageWidth;

			if (point.y > imageHeight)
				point.y = imageHeight;
		}

		box = this.get_box(this.startPoint, point)
	}

	if (box.y < 0)
		box.y = 0;

	if (box.x < 0)
		box.x = 0;

	if (box.x + box.width > imageWidth)
		box.x = imageWidth - box.width;

	if (box.y + box.height > imageHeight)
		box.y = imageHeight - box.height;

	this.currBox.css({
		"outline": "2px dotted #ffbc00",
		"position": "absolute",
		"top": box.y + "px",
		"left": box.x + "px",
		"width": box.width + "px",
		"height": box.height + "px",
	})
}

const labels = [ "text", "table", "picture" ]
const colors = [ "255, 0, 0", "0, 255, 0", "0, 0, 255" ]

let labeler = new Labeler(labels, colors)

$(document).mousedown(function(e) { labeler.mousedown(e) })
$(document).mouseup(function(e) { labeler.mouseup(e) })
$(document).mousemove(function(e) { labeler.mousemove(e) })

labeler.show_entities()

$(document).on("dragstart", function(e) {
	if (e.target.nodeName.toUpperCase() == "IMG")
		return false;
});

$("#reset-btn").click(function(e) {
	labeler.remove_all()
})
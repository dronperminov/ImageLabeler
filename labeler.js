const diff = 5

var startPoint = null
var endPoint = null
var currBox = null
var entities = []

var moveIndex = -1
var movePoint = null

var resizeIndex = -1
var resizeType = null
var resizePoint = null

var img = $('.labeler-image')

function get_box(startPoint, endPoint) {
	x = Math.min(startPoint.x, endPoint.x)
	y = Math.min(startPoint.y, endPoint.y)

	width = Math.abs(startPoint.x - endPoint.x)
	height = Math.abs(startPoint.y - endPoint.y)

	return { 
		x: x,
		y: y,
		width: width,
		height: height
	}
}

function get_box_index(x, y) {
	for (let i = 0; i < entities.length; i++) {
		let box = entities[i]

		if (x > box.x + diff && y > box.y + diff && x < box.x + box.width - diff && y < box.y + box.height - diff)
			return i
	}

	return -1
}

function check_line(x, y, x1, y1, x2, y2) {
	if (x1 == x2) {
		return x > x1 - diff && x < x1 + diff && y >= y1 && y <= y2
	}
	else if (y1 == y2) {
		return y > y1 - diff && y < y1 + diff && x >= x1 && x <= x2
	}

	return false
}

function get_box_resize_index(x, y) {
	for (let i = 0; i < entities.length; i++) {
		let box = entities[i]

		if (check_line(x, y, box.x, box.y, box.x, box.y + box.height))
			return { index: i, type: 1 }
			
		if (check_line(x, y, box.x, box.y, box.x + box.width, box.y))
			return { index: i, type: 2 }

		if (check_line(x, y, box.x + box.width, box.y, box.x + box.width, box.y + box.height))
			return { index: i, type: 3 }
			
		if (check_line(x, y, box.x, box.y + box.height, box.x + box.width, box.y + box.height))
			return { index: i, type: 4 }
	}

	return null
}

function show_entities() {
	$("#entities-data").text(JSON.stringify({ name: "name", entites: entities }, null, "  "));
}

img.mousedown(function(e) {
	let index = get_box_index(e.pageX, e.pageY)
	let resizing = get_box_resize_index(e.pageX, e.pageY)

	if (e.button == 0) {
		if (index == -1 && resizing == null) {
			startPoint = { x: e.pageX, y: e.pageY }
			currBox = $('<div class="label-box" id=box-' + entities.length + ' draggable=false></div>')
			currBox.appendTo(img)
			moveIndex = -1
		}
		else if (resizing == null) {
			movePoint = { x: e.pageX, y: e.pageY }
			currBox = $('#box-' + index)
			moveIndex = index
		}
		else {
			resizePoint = { x: e.pageX, y: e.pageY }
			currBox = $('#box-' + resizing.index)
			resizeIndex = resizing.index
			resizeType = resizing.type
		}
	}
	else if (e.button == 2) {
		$('#box-' + index).remove()

		for (let i = index + 1; i < entities.length; i++)
			$('#box-' + i).attr('id', 'box-' + (i - 1));

		entities.splice(index, 1)
	}

	show_entities()
})

img.mouseup(function(e) {
	if (e.button != 0)
		return

	if (moveIndex == -1 && resizeIndex == -1) {
		endPoint = { x: e.pageX, y: e.pageY }
		entities.push(get_box(startPoint, endPoint))

		startPoint = null
		endPoint = null
	}

	moveIndex = -1
	resizeIndex = -1
	show_entities()
})

img.mousemove(function(e) {
	if (startPoint == null && moveIndex == -1 && resizeIndex == -1) {
		let index = get_box_index(e.pageX, e.pageY)

		for (let i = 0; i < entities.length; i++)
			$('#box-' + i).css('border', "3px solid red")

		if (index != -1) {
			$('#box-' + index).css('border', "3px solid green")
			$('#box-' + index).css('cursor', "pointer")
			return					
		}

		let resizing = get_box_resize_index(e.pageX, e.pageY)

		if (resizing != null) {
			if (resizing.type == 1 || resizing.type == 3)
				$('#box-' + resizing.index).css('cursor', "w-resize")
			else
				$('#box-' + resizing.index).css('cursor', "s-resize")
			return
		}

		return
	}

	if (moveIndex > -1) {
		let dx = e.pageX - movePoint.x
		let dy = e.pageY - movePoint.y

		movePoint.x = e.pageX
		movePoint.y = e.pageY

		box = entities[moveIndex]
		box.x += dx
		box.y += dy

		if (box.x + box.width > img.width)
			box.x = img.width - box.width - 1

		show_entities()
	}
	else if (resizeIndex > -1) {
		let dx = e.pageX - resizePoint.x
		let dy = e.pageY - resizePoint.y

		resizePoint.x = e.pageX
		resizePoint.y = e.pageY

		box = entities[resizeIndex]

		if (resizeType == 1) {
			box.x += dx
			box.width -= dx
		}
		else if (resizeType == 2) {
			box.y += dy
			box.height -= dy
		}
		else if (resizeType == 3) {
			box.width += dx
		}
		else if (resizeType == 4) {
			box.height += dy
		}
		
		show_entities()
	}
	else {
		point = { x: e.pageX, y: e.pageY }
		box = get_box(startPoint, point)
	}

	currBox.css({
		"border": "3px solid red",
        "position": "absolute",
        "top": box.y + "px",
        "left": box.x + "px",
        "width": box.width + "px",
        "height": box.height + "px",
	})
})
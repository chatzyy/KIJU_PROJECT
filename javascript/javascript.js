

function openForm(table) {

    // ใส่ชื่อโต๊ะลงในช่อง
    document.getElementById("tableName").value = table;

    // เปิด Form
    document.getElementById("myModal")
        .classList.remove("hidden");

    document.getElementById("myModal")
        .classList.add("flex");
}


function closeForm() {

    // ปิด Form
    document.getElementById("myModal")
        .classList.remove("flex");

    document.getElementById("myModal")
        .classList.add("hidden");
}


function saveForm() {

    alert("บันทึกข้อมูลเรียบร้อย");

    closeForm();
}


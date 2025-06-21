fetch('navbar.html')
    .then(res => res.text())
    .then(html => {
        document.getElementById('navbar').innerHTML = html;
        document.addEventListener('DOMContentLoaded', function () {
            const elems = document.querySelectorAll('.sidenav');
            M.Sidenav.init(elems);
        });
    });

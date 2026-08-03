async function testDelete() {
    try {
        console.log("1. Logging in...");
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'krish111@gmail.com',
                password: '123456'
            })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error("Login failed:", loginData);
            return;
        }
        const token = loginData.token;
        const userId = loginData.user.id || loginData.user._id;
        console.log("Logged in successfully. User ID:", userId);

        console.log("\n2. Fetching user's projects...");
        const projectsRes = await fetch(`http://localhost:5000/api/projects/my/${userId}`);
        const projectsData = await projectsRes.json();
        const projects = projectsData.projects;
        console.log(`Found ${projects.length} projects:`);
        projects.forEach(p => console.log(`- ${p.title} (${p._id || p.id})`));

        if (projects.length === 0) {
            console.log("No projects to delete.");
            return;
        }

        const projectToDelete = projects[0];
        const idToDelete = projectToDelete._id || projectToDelete.id;
        console.log(`\n3. Attempting to delete project "${projectToDelete.title}" (ID: ${idToDelete})...`);
        
        const deleteRes = await fetch(`http://localhost:5000/api/projects/delete/${idToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const deleteData = await deleteRes.json();
        console.log("Delete Response status:", deleteRes.status);
        console.log("Delete Response data:", deleteData);
    } catch (e) {
        console.error("Error occurred:", e);
    }
}

testDelete();

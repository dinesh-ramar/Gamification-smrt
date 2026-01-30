function downloadRewardCouponSection() {
    if (!window.appConfig.origin) {
        console.error("origin URL not set in config.");
        return;
    }

    const pr_reward_type = document.getElementById('pr_reward_type').value;
    const pr_category = document.getElementById('pr_category').value;
    const pr_image_url = document.getElementById('pr_image_url').value;
    let COUPON_CODE = '';
    if (pr_reward_type !== 'static_offer') {
        const el = document.getElementById("rewardCouponSection");
        COUPON_CODE = el ? el.innerText : '';
    }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        // ✅ DRAW COUPON CODE ONLY IF NOT static_offer
        if (pr_reward_type !== "static_offer") {
            // Configure text for the coupon code
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#333333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Position for the coupon code
            const codeX = canvas.width * 0.68;
            const codeY = canvas.height * 0.62;

            // --- DRAW BORDER AROUND COUPON CODE ---
            /* const textWidth = ctx.measureText(COUPON_CODE).width;
            const paddingX = 20;
            const paddingY = 12;
            const fontSize = 24;

            const rectX = codeX - textWidth / 2 - paddingX;
            const rectY = codeY - fontSize / 2 - paddingY / 2;
            const rectWidth = textWidth + paddingX * 2;
            const rectHeight = fontSize + paddingY;

            ctx.save();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000'; // Border color (black)
            ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
            ctx.restore(); */
            // --------------------------------------

            // Add shadow for the text
            ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
            ctx.shadowBlur = 1;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;

            ctx.fillText(COUPON_CODE, codeX, codeY);
        }

        // ✅ Export image regardless of reward type
        canvas.toBlob(function (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `citi-${COUPON_CODE}.png`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        }, 'image/png');
    };

    img.onerror = function () {
        alert('Error loading the banner image. Please check the image path.');
    };

    // ✅ Set image source path based on reward type
    if (pr_reward_type === "static_offer") {
        img.src = `${window.appConfig.origin}/smrt-gamification/smrt-frontend/assets/images/banner/${pr_category}/${pr_image_url}`;
    } else if (pr_reward_type === "lazada_5" || pr_reward_type === "lazada_20") {
        img.src = `${window.appConfig.origin}/smrt-gamification/smrt-frontend/assets/images/banner/Lazada/${pr_reward_type == 'lazada_5' ? 'lazada_5' : 'lazada_20'}.png`;
    }
}

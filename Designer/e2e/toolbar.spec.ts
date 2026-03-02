import { test, expect } from '@playwright/test';

// Configuration for local dev testing
test.use({ baseURL: 'http://localhost:3000' });

test.describe('Unity WebGL Editor Toolbar', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to a standalone mock test route so we don't need Firebase auth
        await page.goto('/test-toolbar');

        // Wait for the app to initialize
        await page.waitForLoadState('networkidle');
    });

    test('toolbar renders with all 6 tools', async ({ page }) => {
        // Check if toolbar container exists
        const toolbar = page.locator('.unity-toolbar-container');
        await expect(toolbar).toBeVisible();

        // Check all 6 tools are rendered
        const buttons = toolbar.locator('.unity-toolbar-button');
        await expect(buttons).toHaveCount(6);

        // Verify tools by title (from our implementation)
        await expect(page.locator('button[title="Hand Tool (Q)"]')).toBeVisible();
        await expect(page.locator('button[title="Move Tool (W)"]')).toBeVisible();
        await expect(page.locator('button[title="Rotate Tool (E)"]')).toBeVisible();
        await expect(page.locator('button[title="Scale Tool (R)"]')).toBeVisible();
        await expect(page.locator('button[title="Rect Tool (T)"]')).toBeVisible();
        await expect(page.locator('button[title="Transform Tool (Y)"]')).toBeVisible();
    });

    test('Hand tool is active by default', async ({ page }) => {
        const handButton = page.locator('button[title="Hand Tool (Q)"]');
        await expect(handButton).toHaveClass(/active/);
    });

    test('clicking tools updates active state', async ({ page }) => {
        const handButton = page.locator('button[title="Hand Tool (Q)"]');
        const moveButton = page.locator('button[title="Move Tool (W)"]');

        // Click Move
        await moveButton.click();
        await expect(moveButton).toHaveClass(/active/);
        await expect(handButton).not.toHaveClass(/active/);

        // Click back to Hand
        await handButton.click();
        await expect(handButton).toHaveClass(/active/);
        await expect(moveButton).not.toHaveClass(/active/);
    });

    test('keyboard shortcuts activate tools', async ({ page }) => {
        const moveButton = page.locator('button[title="Move Tool (W)"]');
        const rotateButton = page.locator('button[title="Rotate Tool (E)"]');
        const scaleButton = page.locator('button[title="Scale Tool (R)"]');

        // Press W
        await page.keyboard.press('w');
        await expect(moveButton).toHaveClass(/active/);

        // Press E
        await page.keyboard.press('e');
        await expect(rotateButton).toHaveClass(/active/);

        // Press R
        await page.keyboard.press('r');
        await expect(scaleButton).toHaveClass(/active/);
    });

    test('cursor style changes based on active tool', async ({ page }) => {
        // The cursor style is applied on the element wrapping the Unity component
        const unityWrapper = page.locator('.unity-toolbar-container').locator('..'); // parent wrapper

        // Hand tool default is 'grab' when hovered (in our implementation, default cursor until hovered)
        // To trigger cursor change, we must hover
        await unityWrapper.hover();

        // Hand tool
        await page.keyboard.press('q');
        await expect(unityWrapper).toHaveCSS('cursor', 'grab');

        // Mouse down should change to grabbing
        await page.mouse.down();
        await expect(unityWrapper).toHaveCSS('cursor', 'grabbing');
        await page.mouse.up();

        // Move tool
        await page.keyboard.press('w');
        await expect(unityWrapper).toHaveCSS('cursor', 'crosshair');
    });

    test('object card selection sync highlights card (mock)', async ({ page }) => {
        // The test-toolbar page has a dummy card for "TestPlaywrightObject"
        const objectCard = page.locator('.chakra-card').filter({ hasText: 'TestPlaywrightObject' });

        await expect(objectCard).toBeVisible();

        // Simulate Unity dispatching selection event to window
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('unityObjectSelected', { detail: 'TestPlaywrightObject' }));
        });

        // Check if card has the selection styling (defined as blue border in our code)
        // The exact style we set the border to: '2px solid' and borderColor 'blue.400'
        await expect(objectCard).toHaveCSS('border-color', 'rgb(66, 153, 225)'); // #4299e1

        // Simulate clicking the card to deselect itself
        await objectCard.click();

        // Border color should revert to transparent (rgba(0, 0, 0, 0))
        await expect(objectCard).toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
    });
});
